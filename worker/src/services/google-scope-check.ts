/**
 * Google OAuth scope verification — runs at worker boot.
 *
 * Calls the lightest possible API on each Google product to verify the
 * current refresh token has all required scopes. If any scope is missing,
 * logs a clear error so the operator knows to re-run the OAuth flow.
 *
 * Does NOT block the worker from booting — the worker keeps running even
 * if some scopes are missing (e.g. dev environments without Google config).
 *
 * SOLID notes:
 *   - Single responsibility: read-only scope verification, no side effects.
 *   - Open/closed: add new scope checks by extending SCOPE_CHECKS array.
 */

import { google } from 'googleapis';
import { config } from '../config.js';
import { getOAuth2Client } from './google-auth.js';
import { logger } from '../logger.js';

interface ScopeCheck {
  name: string;
  scope: string;
  /** A no-op call that requires this scope. Returns true on success. */
  probe: () => Promise<void>;
}

export async function checkGoogleScopes(): Promise<void> {
  // Skip entirely in environments without Google config — dev / test
  if (
    !config.googleClientId ||
    !config.googleClientSecret ||
    !config.googleRefreshToken
  ) {
    logger.debug('Google OAuth not configured — skipping scope check');
    return;
  }

  const auth = getOAuth2Client();

  const checks: ScopeCheck[] = [
    {
      name: 'Calendar',
      scope: 'https://www.googleapis.com/auth/calendar',
      probe: async () => {
        const calendar = google.calendar({ version: 'v3', auth });
        // freebusy.query is the slot-availability call — same scope used in production
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const calendarId = config.bookingCalendarId || 'primary';
        await calendar.freebusy.query({
          requestBody: {
            timeMin: now.toISOString(),
            timeMax: oneHourLater.toISOString(),
            items: [{ id: calendarId }],
          },
        });
      },
    },
    {
      name: 'Gmail',
      scope: 'https://www.googleapis.com/auth/gmail.send',
      probe: async () => {
        // gmail.send is intentionally a minimal scope — Google does NOT let it
        // call gmail.users.getProfile (needs readonly/metadata) or messages.list
        // (needs readonly). To verify the scope is genuinely present we ask
        // Google's tokeninfo endpoint directly with the current access token
        // and check the returned scope list.
        const accessTokenRes = await auth.getAccessToken();
        const accessToken = accessTokenRes.token;
        if (!accessToken) {
          throw new Error('No access token — refresh token may be invalid');
        }
        const res = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
        );
        if (!res.ok) {
          throw new Error(`tokeninfo returned HTTP ${res.status}`);
        }
        const info = (await res.json()) as { scope?: string };
        const grantedScopes = (info.scope ?? '').split(' ').filter(Boolean);
        if (!grantedScopes.includes('https://www.googleapis.com/auth/gmail.send')) {
          throw new Error(
            `gmail.send not present in granted scopes: ${grantedScopes.join(', ')}`,
          );
        }
      },
    },
    {
      name: 'Admin Directory (Groups)',
      scope: 'https://www.googleapis.com/auth/admin.directory.group',
      probe: async () => {
        const admin = google.admin({ version: 'directory_v1', auth });
        // List groups for the authenticated workspace — verifies group scope
        await admin.groups.list({ customer: 'my_customer', maxResults: 1 });
      },
    },
    {
      name: 'Contacts',
      scope: 'https://www.googleapis.com/auth/contacts',
      probe: async () => {
        const people = google.people({ version: 'v1', auth });
        // List the smallest possible set of contacts to verify scope
        await people.people.connections.list({
          resourceName: 'people/me',
          pageSize: 1,
          personFields: 'names',
        });
      },
    },
  ];

  const results = await Promise.allSettled(checks.map(async (c) => {
    try {
      await c.probe();
      return { name: c.name, ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { name: c.name, ok: false as const, error: message, scope: c.scope };
    }
  }));

  const missing: { name: string; error: string; scope: string }[] = [];
  const ok: string[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (r.value.ok) {
        ok.push(r.value.name);
      } else {
        missing.push({
          name: r.value.name,
          error: r.value.error,
          scope: r.value.scope,
        });
      }
    }
  }

  if (missing.length === 0) {
    logger.info({ scopes: ok }, 'Google OAuth scope check passed');
    return;
  }

  logger.error(
    {
      missing,
      ok,
    },
    'Google OAuth scope check FAILED — re-run: pnpm --filter @octio/worker run get-refresh-token',
  );
}
