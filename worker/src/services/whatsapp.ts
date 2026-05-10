/**
 * WhatsApp service — Twilio-backed implementation.
 *
 * WhatsApp is the primary channel for time-sensitive follow-ups. Email is
 * the fallback (used only when no phone number is available OR when a send
 * fails). The cron jobs attempt WhatsApp first and only call the email
 * template functions if WhatsApp is unavailable or unsuccessful.
 *
 * Sandbox vs production:
 *   - Sandbox (dev): set TWILIO_WHATSAPP_FROM to Twilio's sandbox number
 *     (e.g. whatsapp:+14155238886). Recipients must first message the
 *     sandbox to opt in. Freeform messages allowed within 24h session.
 *   - Production: register a verified WhatsApp sender in Twilio. Outside
 *     the 24h session you can only send pre-approved template messages.
 *     Set TWILIO_TEMPLATE_* vars to the template content SIDs.
 *
 * SOLID notes:
 *   - Interface segregation: consumers depend on WhatsAppService, not twilio.
 *   - Dependency inversion: factory returns the right impl based on config.
 */

import twilio from 'twilio';
import type { Twilio } from 'twilio';
import { config } from '../config.js';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface WhatsAppMessage {
  /** E.164 phone number, e.g. "+27821234567" (no "whatsapp:" prefix needed) */
  to: string;
  /** Pre-approved template content SID for production sends */
  contentSid?: string;
  /** Template variables as JSON string, e.g. '{"1":"Simekani"}' */
  contentVariables?: Record<string, string>;
  /** Free-form text body (sandbox + 24h session only) */
  body?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export interface WhatsAppService {
  /** Whether the service is configured and can send */
  isEnabled(): boolean;
  /** Send a message. Returns success/error result without throwing. */
  send(msg: WhatsAppMessage): Promise<WhatsAppSendResult>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a phone number to Twilio's WhatsApp format: "whatsapp:+<E.164>".
 * Accepts input in any reasonable format; if the prefix is already present
 * it's preserved.
 */
function toWhatsAppAddress(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('whatsapp:')) return trimmed;
  // Ensure leading + for E.164
  const e164 = trimmed.startsWith('+') ? trimmed : `+${trimmed.replace(/^0+/, '27')}`;
  return `whatsapp:${e164}`;
}

// ---------------------------------------------------------------------------
// Disabled implementation — returned when Twilio config is missing
// ---------------------------------------------------------------------------

class DisabledWhatsAppService implements WhatsAppService {
  isEnabled(): boolean {
    return false;
  }

  async send(msg: WhatsAppMessage): Promise<WhatsAppSendResult> {
    logger.debug({ to: msg.to }, 'WhatsApp not configured — skipping send');
    return { success: false, error: 'whatsapp_not_configured' };
  }
}

// ---------------------------------------------------------------------------
// Live Twilio implementation
// ---------------------------------------------------------------------------

class TwilioWhatsAppService implements WhatsAppService {
  private client: Twilio;
  private from: string;

  constructor(accountSid: string, authToken: string, from: string) {
    this.client = twilio(accountSid, authToken);
    this.from = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
  }

  isEnabled(): boolean {
    return true;
  }

  async send(msg: WhatsAppMessage): Promise<WhatsAppSendResult> {
    try {
      const to = toWhatsAppAddress(msg.to);

      // Prefer template send when we have a contentSid (required outside 24h session)
      if (msg.contentSid) {
        const response = await this.client.messages.create({
          from: this.from,
          to,
          contentSid: msg.contentSid,
          contentVariables: msg.contentVariables
            ? JSON.stringify(msg.contentVariables)
            : undefined,
        });
        logger.info({ to, sid: response.sid, template: msg.contentSid }, 'WhatsApp template sent');
        return { success: true, messageSid: response.sid };
      }

      // Freeform fallback — sandbox only, or within 24h session
      if (!msg.body) {
        return { success: false, error: 'no_body_or_template_provided' };
      }

      const response = await this.client.messages.create({
        from: this.from,
        to,
        body: msg.body,
      });
      logger.info({ to, sid: response.sid }, 'WhatsApp freeform sent');
      return { success: true, messageSid: response.sid };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err, to: msg.to }, 'WhatsApp send failed');
      return { success: false, error: message };
    }
  }
}

// ---------------------------------------------------------------------------
// Factory — returns the right implementation based on config
// ---------------------------------------------------------------------------

export function createWhatsAppService(): WhatsAppService {
  const { twilioAccountSid, twilioAuthToken, twilioWhatsappFrom } = config;

  if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappFrom) {
    logger.debug('Twilio config missing — WhatsApp will be disabled');
    return new DisabledWhatsAppService();
  }

  logger.info({ from: twilioWhatsappFrom }, 'Twilio WhatsApp service enabled');
  return new TwilioWhatsAppService(twilioAccountSid, twilioAuthToken, twilioWhatsappFrom);
}

/** Singleton instance — reused across cron jobs */
export const whatsapp = createWhatsAppService();
