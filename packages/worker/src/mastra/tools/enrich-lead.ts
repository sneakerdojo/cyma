import { createTool } from '@mastra/core/tools';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../../db/client.js';

// ---------------------------------------------------------------------------
// Tool definition (SRP: owns lead enrichment writes only — DB access is
// delegated to the shared Drizzle client)
// ---------------------------------------------------------------------------

export const enrichLeadTool = createTool({
  id: 'enrich_lead',
  description: `Persist a single qualifying datapoint about the lead to CRM scoring.

WHEN TO CALL: every time the user reveals information about their team size, timeline urgency, decision makers, pain points, competitor mentions, budget confirmation, or any other qualifying context. Call it IMMEDIATELY in the same reply where you acknowledge the fact. Acknowledging the data in text without firing this tool is a critical bug — the data is silently dropped from CRM scoring.

WHEN NOT TO CALL: pure greetings ("hi", "hello"), pure chitchat ("nice weather"), filler messages, or repeated re-statements of info already recorded this conversation.

EXAMPLES:
- User: "We're a team of 30." → Call enrich_lead(field="team_size", value="~30 people") AND reply "30-person team — useful context."
- User: "Our onboarding takes weeks." → Call enrich_lead(field="pain_points", value="long customer onboarding") AND reply "That's where AI agents pay off fast."
- User: "Need it in 6 weeks." → Call enrich_lead(field="timeline_urgency", value="6-week deadline") AND reply "6 weeks is tight but doable."

RETURNS: {ok: true, message: "noted"} on success, {ok: false, error} otherwise.`,
  inputSchema: z.object({
    contactEmail: z
      .string()
      .email()
      .describe('The lead contact email from wizard context'),
    field: z
      .enum([
        'team_size',
        'timeline_urgency',
        'decision_makers',
        'pain_points',
        'competitor_mentions',
        'budget_confirmation',
        'additional_context',
      ])
      .describe('The qualifying dimension being recorded'),
    value: z
      .string()
      .describe('The qualifying information to store — structured data, not raw conversation text'),
  }),
  execute: async (inputData): Promise<{ ok: boolean; message?: string; error?: string }> => {
    const { contactEmail, field, value } = inputData;

    try {
      // Resolve the contact record by email. If the contact cannot be found
      // we still write the score row with a null contactId so no enrichment
      // data is silently lost.
      const [contact] = await db
        .select({ id: schema.contacts.id })
        .from(schema.contacts)
        .where(eq(schema.contacts.email, contactEmail))
        .limit(1);

      await db.insert(schema.leadScores).values({
        contactId: contact?.id ?? null,
        dimension: field,
        points: 0,
        reason: value,
        source: 'agent',
      });

      return { ok: true, message: 'noted' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { ok: false, error };
    }
  },
});
