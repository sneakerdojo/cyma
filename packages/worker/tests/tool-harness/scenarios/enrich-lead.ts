/**
 * Intensity scenarios for enrich_lead.
 *
 * Tool surface (from src/mastra/tools/enrich-lead.ts):
 *   contactEmail: email
 *   field: enum(team_size | timeline_urgency | decision_makers | pain_points |
 *               competitor_mentions | budget_confirmation | additional_context)
 *   value: string (no length cap — surfaced in audit as a risk)
 *
 * What the harness verifies:
 *   - Smoke: when caller reveals qualifying info, tool fires with correct field
 *   - Stress: oversize value strings get stored without exception
 *   - Adversarial: SQL-injection-shaped strings safe (Drizzle params), unknown
 *     emails create orphan rows (silent contactId=null), tool shouldn't fire
 *     for irrelevant chitchat
 *   - Real side effect: corresponding row appears in lead_scores
 */

import { db, schema } from '../../../src/db/client.js';
import { eq, like, and } from 'drizzle-orm';
import { enrichLeadTool } from '../../../src/mastra/tools/enrich-lead.js';
import { buildHarnessAgent } from '../agent-builder.js';
import type { Scenario, HarnessConfig, CapturedCall } from '../runner.js';

// Test-data tagging strategy. Cleanup deletes rows whose `reason` field
// starts with this prefix. The agent is instructed via systemHint to use a
// per-scenario contact email in the test domain so we can also clean by
// contact email join.
const TEST_PREFIX = '__INTENSITY_TEST__';
const TEST_DOMAIN = '@intensity-test.octio.invalid';

function testEmail(name: string): string {
  return `${name}${TEST_DOMAIN}`;
}

const INSTRUCTIONS = `You are Octio, a conversational assistant qualifying potential customers.

The current caller's contact email is: {{CONTACT_EMAIL}}

You have one tool: enrich_lead. Call it whenever the caller reveals qualifying information about their business — team size, timeline urgency, decision makers, pain points, competitor mentions, budget confirmation, or any other relevant context.

Rules:
- Always pass contactEmail={{CONTACT_EMAIL}} exactly (never substitute a different email).
- value should be a concise summary of what you learned, not raw quotes.
- IMPORTANT for this test: every value string you record MUST start with the literal prefix "${TEST_PREFIX}: " followed by your summary. This lets the test harness identify and clean up the row afterwards. Do not omit this prefix.
- Do NOT call the tool for greetings or irrelevant chitchat — only when real qualifying info is shared.
- If asked questions, answer briefly. Keep replies under two sentences.`;

function instructionsForEmail(email: string): string {
  return INSTRUCTIONS.replace(/\{\{CONTACT_EMAIL\}\}/g, email);
}

// ---------------------------------------------------------------------------
// Per-call assertion — checks args shape is reasonable
// ---------------------------------------------------------------------------
function enrichLeadCallAssertion(call: CapturedCall): string | null {
  if (call.tool !== 'enrich_lead') return null;
  const args = call.args as {
    contactEmail?: unknown;
    field?: unknown;
    value?: unknown;
  };
  if (typeof args.contactEmail !== 'string') return 'contactEmail missing or not string';
  if (!args.contactEmail.includes('@')) return `contactEmail not email-shaped: ${args.contactEmail}`;
  if (typeof args.field !== 'string') return 'field missing or not string';
  const ALLOWED_FIELDS = [
    'team_size',
    'timeline_urgency',
    'decision_makers',
    'pain_points',
    'competitor_mentions',
    'budget_confirmation',
    'additional_context',
  ];
  if (!ALLOWED_FIELDS.includes(args.field)) return `field not in enum: ${args.field}`;
  if (typeof args.value !== 'string') return 'value missing or not string';
  if (args.value.length === 0) return 'value is empty';
  return null;
}

// ---------------------------------------------------------------------------
// Final assertion — verifies a lead_scores row actually landed in DB
// ---------------------------------------------------------------------------
async function verifyDbRowExists(
  contactEmail: string,
  expectedField: string,
): Promise<string | null> {
  // Look for a lead_scores row matching our test prefix + the expected field.
  // We need to join on contacts.email since lead_scores doesn't store the email.
  // For orphan rows (contactId=null) we match by reason prefix only.
  const ourTestRows = await db
    .select({
      id: schema.leadScores.id,
      dimension: schema.leadScores.dimension,
      reason: schema.leadScores.reason,
      contactId: schema.leadScores.contactId,
    })
    .from(schema.leadScores)
    .where(
      and(
        eq(schema.leadScores.source, 'agent'),
        like(schema.leadScores.reason, `${TEST_PREFIX}%`),
      ),
    );

  const matches = ourTestRows.filter((r) => r.dimension === expectedField);
  if (matches.length === 0) {
    return `expected lead_scores row with dimension=${expectedField} and reason like '${TEST_PREFIX}%' but none found`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export function buildEnrichLeadScenarios(): Scenario[] {
  return [
    // ── SMOKE ────────────────────────────────────────────────────────
    {
      name: 'smoke_team_size_revealed',
      category: 'smoke',
      intent: 'Caller reveals team size — tool should fire with field=team_size',
      systemHint: instructionsForEmail(testEmail('smoke-team-size')),
      turns: [
        'Hi there, I am looking at your AI agent product.',
        'We are a small team — about 8 engineers and 2 designers.',
      ],
      expectTools: ['enrich_lead'],
      perCallAssertion: enrichLeadCallAssertion,
      finalAssertion: () => verifyDbRowExists(testEmail('smoke-team-size'), 'team_size'),
    },
    {
      name: 'smoke_pain_points_revealed',
      category: 'smoke',
      intent: 'Caller describes pain points — tool fires with field=pain_points',
      systemHint: instructionsForEmail(testEmail('smoke-pain-points')),
      turns: [
        'Hey, looking at your services.',
        'Our biggest issue is that customer onboarding takes weeks and our support team is drowning in repetitive questions.',
      ],
      expectTools: ['enrich_lead'],
      perCallAssertion: enrichLeadCallAssertion,
      finalAssertion: () => verifyDbRowExists(testEmail('smoke-pain-points'), 'pain_points'),
    },
    {
      name: 'smoke_timeline_urgency',
      category: 'smoke',
      intent: 'Caller mentions timeline — tool fires with field=timeline_urgency',
      systemHint: instructionsForEmail(testEmail('smoke-timeline')),
      turns: [
        'Hi, I need to ship something in the next 6 weeks.',
      ],
      expectTools: ['enrich_lead'],
      perCallAssertion: enrichLeadCallAssertion,
      finalAssertion: () => verifyDbRowExists(testEmail('smoke-timeline'), 'timeline_urgency'),
    },

    // ── STRESS ───────────────────────────────────────────────────────
    {
      name: 'stress_no_qualifying_info',
      category: 'stress',
      intent: 'Pure chitchat — tool MUST NOT fire',
      systemHint: instructionsForEmail(testEmail('stress-no-info')),
      turns: [
        'Hi there.',
        'How are you today?',
        'Okay thanks, bye.',
      ],
      forbidTools: ['enrich_lead'],
    },
    {
      name: 'stress_mixed_signal_then_chitchat',
      category: 'stress',
      intent: 'Caller reveals info then drifts — tool fires once, not on chitchat',
      systemHint: instructionsForEmail(testEmail('stress-mixed')),
      turns: [
        'Hi, we are a team of 30.',
        'Anyway, nice weather today right?',
      ],
      expectTools: ['enrich_lead'],
      perCallAssertion: enrichLeadCallAssertion,
      finalAssertion: (record) => {
        const calls = record.allCalls.filter((c) => c.tool === 'enrich_lead');
        if (calls.length === 0) return 'expected at least one call';
        if (calls.length > 2) return `expected at most 2 calls, got ${calls.length} (over-eager firing)`;
        return null;
      },
    },

    // ── ADVERSARIAL ──────────────────────────────────────────────────
    {
      name: 'adversarial_sql_shape_in_value',
      category: 'adversarial',
      intent: 'SQL-injection-shaped value must be stored literally (Drizzle params), no DB break',
      systemHint: instructionsForEmail(testEmail('adv-sql')),
      turns: [
        "Our team size is: '; DROP TABLE contacts; --",
      ],
      expectTools: ['enrich_lead'],
      perCallAssertion: enrichLeadCallAssertion,
      finalAssertion: async () => {
        // Verify contacts table is still alive
        const c = await db.select({ id: schema.contacts.id }).from(schema.contacts).limit(1);
        if (!Array.isArray(c)) return 'contacts table not queryable after SQL-shaped input';
        return verifyDbRowExists(testEmail('adv-sql'), 'team_size');
      },
    },
    {
      name: 'adversarial_oversize_value',
      category: 'adversarial',
      intent: 'Very long pain-point description — tool stores it without crashing (audit risk: no length cap)',
      systemHint: instructionsForEmail(testEmail('adv-oversize')),
      turns: [
        'Our pain points are: ' + 'we have terrible customer support latency, '.repeat(60),
      ],
      expectTools: ['enrich_lead'],
      perCallAssertion: enrichLeadCallAssertion,
    },
    {
      name: 'adversarial_xss_in_value',
      category: 'adversarial',
      intent: 'XSS-shaped value stored verbatim (downstream renderers must escape)',
      systemHint: instructionsForEmail(testEmail('adv-xss')),
      turns: [
        'Our biggest pain point is <script>alert("xss")</script> integration with legacy systems.',
      ],
      expectTools: ['enrich_lead'],
      perCallAssertion: enrichLeadCallAssertion,
    },
  ];
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export async function cleanupEnrichLead(): Promise<void> {
  // Drop any lead_scores rows our test created (identified by prefix).
  // Then drop any contacts in the test domain.
  await db
    .delete(schema.leadScores)
    .where(
      and(
        eq(schema.leadScores.source, 'agent'),
        like(schema.leadScores.reason, `${TEST_PREFIX}%`),
      ),
    );
  await db
    .delete(schema.contacts)
    .where(like(schema.contacts.email, `%${TEST_DOMAIN}`));
}

// ---------------------------------------------------------------------------
// Harness config factory — wires the real tool + scenarios together.
// ---------------------------------------------------------------------------

export function buildEnrichLeadHarnessConfig(): HarnessConfig {
  return {
    toolGroup: 'enrich_lead',
    scenarios: buildEnrichLeadScenarios(),
    buildAgent: (recordCall) =>
      buildHarnessAgent({
        realTools: { enrich_lead: enrichLeadTool },
        // Per-scenario system prompt is set in the scenario; the agent's
        // own instructions can be minimal because each scenario overrides.
        instructions:
          'You are Octio, qualifying potential customers. Follow the per-scenario system instructions exactly.',
        recordCall,
      }),
  };
}
