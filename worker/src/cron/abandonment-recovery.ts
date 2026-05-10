/**
 * Abandonment recovery cron job.
 *
 * Runs every 15 minutes. Detects sessions that started > 1 hour ago
 * but never completed (no 'session_complete' event). Sends a recovery
 * message via WhatsApp (primary) and falls back to email when WhatsApp
 * is unavailable, unconfigured, or the send fails.
 *
 * Detection logic:
 *   1. Find all 'session_start' events older than 1 hour
 *   2. Exclude sessions that also have a 'session_complete' event
 *   3. Exclude sessions already messaged (emails_sent table — reused)
 *   4. Extract contact email + phone + name from event metadata
 *   5. Try WhatsApp first. On failure / no phone → send email.
 *   6. Record into emails_sent to prevent duplicate sends.
 *
 * SOLID notes:
 *   - Single responsibility: only handles abandonment detection + recovery.
 *   - Dependency inversion: imports db + gmail + whatsapp services, not raw SDKs.
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { emailsSent } from '../db/schema.js';
import { sendAbandonmentRecoveryEmail } from '../services/gmail.js';
import { whatsapp } from '../services/whatsapp.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

export async function runAbandonmentRecovery(): Promise<void> {
  try {
    const abandonedSessions = await db.execute(sql`
      SELECT ce.session_id, ce.metadata
      FROM conversation_events ce
      WHERE ce.action = 'session_start'
        AND ce.created_at < NOW() - INTERVAL '1 hour'
        AND NOT EXISTS (
          SELECT 1 FROM conversation_events ce2
          WHERE ce2.session_id = ce.session_id
            AND ce2.action = 'session_complete'
        )
        AND NOT EXISTS (
          SELECT 1 FROM emails_sent es
          WHERE es.session_id = ce.session_id
            AND es.email_type = 'abandonment_recovery'
        )
      ORDER BY ce.created_at ASC
      LIMIT 20
    `);

    if (abandonedSessions.length === 0) {
      return;
    }

    logger.info(
      { count: abandonedSessions.length },
      'abandoned sessions found — sending recovery messages',
    );

    for (const row of abandonedSessions) {
      const meta = row.metadata as {
        email?: string;
        name?: string;
        phone?: string;
      } | null;
      const email = meta?.email;
      const name = meta?.name ?? 'there';
      const phone = meta?.phone;
      const sessionId = row.session_id as string;

      if (!email && !phone) {
        logger.debug(
          { sessionId },
          'abandoned session has no contact details — skipping',
        );
        continue;
      }

      try {
        let channelUsed: 'whatsapp' | 'email' | null = null;

        // Primary channel: WhatsApp
        if (phone && whatsapp.isEnabled()) {
          const result = await whatsapp.send({
            to: phone,
            contentSid: config.twilioTemplateAbandonment,
            contentVariables: { '1': name },
            body: config.twilioTemplateAbandonment
              ? undefined
              : `Hey ${name}, you didn't finish booking your Octio discovery call. Pick up where you left off: https://octio.co.za`,
          });

          if (result.success) {
            channelUsed = 'whatsapp';
          } else {
            logger.warn(
              { sessionId, error: result.error },
              'WhatsApp abandonment send failed — falling back to email',
            );
          }
        }

        // Fallback channel: email
        if (channelUsed === null && email) {
          await sendAbandonmentRecoveryEmail(email, name);
          channelUsed = 'email';
        }

        if (channelUsed === null) {
          logger.warn({ sessionId }, 'no channel succeeded for abandonment recovery');
          continue;
        }

        // Record against both email and phone if present (prevents duplicates
        // regardless of which channel fired)
        await db.insert(emailsSent).values({
          contactEmail: email ?? phone ?? 'unknown',
          emailType: 'abandonment_recovery',
          sessionId,
        });

        logger.info(
          { contact: email ?? phone, sessionId, channel: channelUsed },
          'abandonment recovery sent',
        );
      } catch (err) {
        logger.error(
          { err, sessionId },
          'failed to send abandonment recovery',
        );
      }
    }
  } catch (err) {
    logger.error({ err }, 'abandonment recovery cron failed');
  }
}
