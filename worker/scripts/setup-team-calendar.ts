/**
 * setup-team-calendar.ts
 *
 * Creates a dedicated Google Calendar for booking discovery calls,
 * shares it with the specified team members, and (for Octio's own setup)
 * writes the resulting calendar ID into worker/.env as BOOKING_CALENDAR_ID.
 *
 * Designed to be:
 *   1. Used now by Octio to set up its own booking calendar
 *   2. Reused later as the primitive that customer onboarding calls when
 *      provisioning a new tenant — same code path, different OAuth token,
 *      different team list, returns the calendar ID for storage in the
 *      tenant DB row instead of writing to .env.
 *
 * Prerequisites:
 *   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN must be set
 *   - The refresh token must have the `calendar` scope (full access).
 *     If you only have `calendar.events`, run get-refresh-token first.
 *
 * Usage (CLI for Octio's setup):
 *   pnpm --filter @octio/worker run setup-team-calendar \
 *     --name "Octio Discovery Calls" \
 *     --timezone "Africa/Johannesburg" \
 *     --share simekani@octio.co.za,team@octio.co.za \
 *     --write-env
 *
 * Programmatic use (future tenant provisioning):
 *   import { provisionTeamCalendar } from './setup-team-calendar.js';
 *   const { calendarId } = await provisionTeamCalendar({
 *     accessToken: tenant.googleAccessToken,
 *     refreshToken: tenant.googleRefreshToken,
 *     name: `${tenant.name} — Discovery Calls`,
 *     timezone: tenant.timezone,
 *     shareWith: tenant.teamMembers,
 *   });
 *   // store calendarId on the tenant record
 */

import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Public types — clean enough to use from a future customer-onboarding flow
// ---------------------------------------------------------------------------

export interface ProvisionInput {
  /** OAuth client ID — Octio's by default, customer's own when multi-tenant */
  clientId: string;
  clientSecret: string;
  /** Refresh token for the Google account that will OWN the calendar */
  refreshToken: string;
  /** Display name for the calendar */
  name: string;
  /** IANA timezone, e.g. "Africa/Johannesburg" */
  timezone: string;
  /** Optional description shown to people the calendar is shared with */
  description?: string;
  /**
   * Email addresses to share the calendar with (gives "writer" permission —
   * can see, create, and modify events but not delete the calendar).
   * Pass an empty array if no team to share with at provisioning time.
   */
  shareWith: string[];
}

export interface ProvisionResult {
  calendarId: string;
  calendarSummary: string;
  shared: string[];
  alreadyExisted: boolean;
}

// ---------------------------------------------------------------------------
// Programmatic API — the part that future onboarding code will reuse
// ---------------------------------------------------------------------------

/**
 * Idempotent: if a calendar with the given name already exists for this
 * account, returns its ID instead of creating a duplicate. Sharing is
 * also idempotent — already-shared addresses are skipped silently.
 */
export async function provisionTeamCalendar(
  input: ProvisionInput,
): Promise<ProvisionResult> {
  const { clientId, clientSecret, refreshToken, name, timezone, shareWith } =
    input;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // ─────────────────────────────────────────────────────────────────────
  // 1. Look for an existing calendar with the same summary (idempotent)
  // ─────────────────────────────────────────────────────────────────────

  const existing = await calendar.calendarList.list({ maxResults: 250 });
  const match = (existing.data.items ?? []).find(
    (c) => c.summary === name,
  );

  let calendarId: string;
  let alreadyExisted = false;

  if (match?.id) {
    calendarId = match.id;
    alreadyExisted = true;
    console.log(`Found existing calendar "${name}" — reusing.`);
    console.log(`  ID: ${calendarId}`);
  } else {
    // ───────────────────────────────────────────────────────────────────
    // 2. Create the calendar
    // ───────────────────────────────────────────────────────────────────
    const created = await calendar.calendars.insert({
      requestBody: {
        summary: name,
        description:
          input.description ??
          `Bookings from the Octio website wizard. All team members can see and manage. Free/busy here drives slot availability shown to leads.`,
        timeZone: timezone,
      },
    });

    if (!created.data.id) {
      throw new Error('Calendar created but no id returned by Google');
    }

    calendarId = created.data.id;
    console.log(`Created calendar "${name}".`);
    console.log(`  ID: ${calendarId}`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3. Share with team members (idempotent — skip already-shared)
  // ─────────────────────────────────────────────────────────────────────

  const shared: string[] = [];

  if (shareWith.length > 0) {
    // Fetch existing ACL once
    const aclList = await calendar.acl.list({ calendarId });
    const alreadyShared = new Set(
      (aclList.data.items ?? [])
        .filter((rule) => rule.scope?.type === 'user')
        .map((rule) => rule.scope?.value)
        .filter((v): v is string => !!v),
    );

    for (const email of shareWith) {
      if (alreadyShared.has(email)) {
        console.log(`  Already shared with ${email} — skipping`);
        continue;
      }

      try {
        await calendar.acl.insert({
          calendarId,
          requestBody: {
            scope: { type: 'user', value: email },
            role: 'writer',
          },
          // Suppress the "you've been invited" email; team members find it in
          // their calendar list automatically.
          sendNotifications: false,
        });
        shared.push(email);
        console.log(`  Shared with ${email} (writer)`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  Failed to share with ${email}: ${msg}`);
      }
    }
  }

  return {
    calendarId,
    calendarSummary: name,
    shared,
    alreadyExisted,
  };
}

// ---------------------------------------------------------------------------
// CLI wrapper — used by Octio for its own setup
// ---------------------------------------------------------------------------

async function runCli(): Promise<void> {
  const { values } = parseArgs({
    options: {
      name: { type: 'string', default: 'Octio Discovery Calls' },
      timezone: { type: 'string', default: 'Africa/Johannesburg' },
      share: { type: 'string', default: '' },
      'write-env': { type: 'boolean', default: false },
      description: { type: 'string' },
    },
  });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error(
      '\nError: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN must all be set in worker/.env.\n',
    );
    process.exit(1);
  }

  const shareWith = values.share
    ? values.share
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
    : [];

  console.log('\n═══════════════════════════════════════════');
  console.log('Provisioning team booking calendar');
  console.log('═══════════════════════════════════════════');
  console.log(`Name:     ${values.name}`);
  console.log(`Timezone: ${values.timezone}`);
  console.log(`Share with: ${shareWith.length > 0 ? shareWith.join(', ') : '(none)'}`);
  console.log('');

  const result = await provisionTeamCalendar({
    clientId,
    clientSecret,
    refreshToken,
    name: values.name as string,
    timezone: values.timezone as string,
    description: values.description,
    shareWith,
  });

  console.log('\n═══════════════════════════════════════════');
  console.log(`Calendar ID: ${result.calendarId}`);
  console.log('═══════════════════════════════════════════\n');

  if (values['write-env']) {
    const envPath = join(__dirname, '..', '.env');
    const current = readFileSync(envPath, 'utf-8');
    const lines = current.split('\n');
    const idx = lines.findIndex((l) => l.startsWith('BOOKING_CALENDAR_ID='));
    const newLine = `BOOKING_CALENDAR_ID=${result.calendarId}`;

    if (idx >= 0) {
      lines[idx] = newLine;
    } else {
      // Add after the OCTIO_TEAM_EMAIL block for tidy grouping
      const insertAfter = lines.findIndex((l) =>
        l.startsWith('OCTIO_TEAM_EMAIL='),
      );
      if (insertAfter >= 0) {
        lines.splice(insertAfter + 1, 0, newLine);
      } else {
        lines.push(newLine);
      }
    }

    writeFileSync(envPath, lines.join('\n'));
    console.log(`Wrote BOOKING_CALENDAR_ID to ${envPath}`);
    console.log('Restart the worker to pick up the new value.\n');
  } else {
    console.log('Add to worker/.env:');
    console.log(`BOOKING_CALENDAR_ID=${result.calendarId}\n`);
  }
}

// Only run the CLI when invoked directly, not when imported.
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('setup-team-calendar.ts')
) {
  runCli().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nFatal: ${msg}\n`);
    process.exit(1);
  });
}
