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
  description:
    'Store qualifying information learned during the conversation. Call this after the user reveals team size, timeline urgency, decision makers, pain points, or competitor mentions. Do NOT call for every message — only when new qualifying information is shared.',
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
