/**
 * A/B test assignment service.
 *
 * Handles sticky variant assignment per session: the first time a given
 * session encounters a test, we randomly assign a variant and persist it.
 * Subsequent calls for the same session return the same variant.
 *
 * SOLID notes:
 *   - Single responsibility: only handles variant selection + persistence.
 *   - Dependency inversion: imports db client, not raw pg.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { abTestAssignments } from '../db/schema.js';
import { logger } from '../logger.js';

/**
 * Get or create a sticky variant assignment for a session + test.
 * Returns the assigned variant name.
 */
export async function getOrAssignVariant(
  sessionId: string,
  testName: string,
  variants: string[],
): Promise<string> {
  if (variants.length === 0) {
    throw new Error(`Cannot assign variant for test "${testName}" — no variants provided`);
  }

  if (variants.length === 1) {
    return variants[0];
  }

  try {
    // Check for existing assignment
    const existing = await db
      .select()
      .from(abTestAssignments)
      .where(
        and(
          eq(abTestAssignments.sessionId, sessionId),
          eq(abTestAssignments.testName, testName),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0].variant;
    }

    // Random assignment (uniform distribution across variants)
    const variant = variants[Math.floor(Math.random() * variants.length)];

    await db.insert(abTestAssignments).values({
      sessionId,
      testName,
      variant,
    });

    logger.debug({ sessionId, testName, variant }, 'new A/B variant assigned');

    return variant;
  } catch (err) {
    // If DB fails, fall back to the first variant (deterministic, non-blocking)
    logger.error({ err, sessionId, testName }, 'A/B assignment failed — falling back to default variant');
    return variants[0];
  }
}
