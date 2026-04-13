/**
 * test-google-integration.ts
 *
 * End-to-end smoke test against the real Google APIs. No database, no HTTP
 * server, just the two services that matter: Calendar + Gmail.
 *
 *   pnpm --filter @octio/worker exec tsx --env-file .env scripts/test-google-integration.ts
 *
 * What it does:
 *   1. Builds a fake wizard intake (test client = simekani@octio.co.za)
 *   2. Creates a real Google Calendar event with a Meet link for tomorrow
 *      at 10:00 SAST
 *   3. Sends a real confirmation email via Gmail API
 *   4. Prints the results
 */

import { createDiscoveryCallEvent, parseSlotToISO } from '../src/services/calendar.js';
import { sendBookingConfirmation } from '../src/services/gmail.js';

// ---------------------------------------------------------------------------
// Build a slot for tomorrow at 10:00 SAST
// ---------------------------------------------------------------------------

// Pick tomorrow's date in UTC (any time of day works — parseSlotToISO only
// uses the date portion once converted to SAST).
const tomorrow = new Date();
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
tomorrow.setUTCHours(0, 0, 0, 0);
const tomorrowIso = tomorrow.toISOString();

const TIME = '10:00';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Display values for the SAST day (UTC + 2h)
const sastDisplay = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000);
const dateLabel = `${dayNames[sastDisplay.getUTCDay()]} ${sastDisplay.getUTCDate()} ${monthNames[sastDisplay.getUTCMonth()]}`;
const label = `${dateLabel} · 10:00 AM`;

const intake = {
  contact: {
    email: 'support@octio.co.za',
    name: 'Support (test booking)',
    company: 'Octio smoke test',
  },
  selectedSlot: {
    id: `${tomorrowIso}-${TIME}`,
    dateLabel,
    time: TIME,
    label,
  },
  selectedService: 'AI Agents & Automations',
  budget: 'R50K-R150K',
  requirements:
    'This is an end-to-end smoke test for the Octio booking integration. If you received this email, Calendar + Gmail are wired up correctly.',
};

console.log('\n— Google integration smoke test —');
console.log(`Slot id:    ${intake.selectedSlot.id}`);
console.log(`Resolved:   ${parseSlotToISO(intake.selectedSlot)}`);
console.log(`Label:      ${intake.selectedSlot.label}`);
console.log(`Attendee:   ${intake.contact.email}`);
console.log('');

async function main() {
  console.log('[1/2] Creating Google Calendar event with Meet link...');
  const calendarResult = await createDiscoveryCallEvent(intake);
  console.log(`      ✓ eventId:      ${calendarResult.eventId}`);
  console.log(`      ✓ meetLink:     ${calendarResult.meetLink}`);
  console.log(`      ✓ calendarLink: ${calendarResult.calendarLink}`);

  console.log('\n[2/2] Sending confirmation email via Gmail...');
  const messageId = await sendBookingConfirmation(intake, calendarResult);
  console.log(`      ✓ gmail messageId: ${messageId}`);

  console.log('\n✓ Done. Check support@octio.co.za for the invite and confirmation email.');
}

main().catch((err) => {
  console.error('\n✗ Smoke test failed:');
  console.error(err instanceof Error ? `${err.message}\n${err.stack}` : err);
  process.exit(1);
});
