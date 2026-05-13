/**
 * extendProfile — write facts to a profile.
 *
 * Policy rules (from docs/superpowers/specs/2026-05-13-profile-system.md):
 *   - category='sensitive' is REJECTED in v1. The spec defers sensitive
 *     capture to v3 (requires per-mention explicit consent).
 *   - category='off_topic' is capped per profile at FACT_OFF_TOPIC_CAP (20).
 *     When over-cap, the oldest off_topic fact is evicted before insert.
 *   - Per-category default TTL:
 *       sensitive  → 90 days  (not applicable in v1 since they're rejected)
 *       off_topic  → 365 days
 *       others     → null (matches profile root retention)
 *
 * One audit-log row per call (not per fact), with summary counts in metadata.
 */

import { createHash } from 'node:crypto';
import type { ProfileFactRow, ProfileRepo } from './repo.js';

export const FACT_OFF_TOPIC_CAP = 20;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface FactInput {
  category: ProfileFactRow['category'];
  key: string;
  value: unknown;
  source: ProfileFactRow['source'];
  confidence?: number;
  /** Caller may override the default TTL — otherwise per-category default applies. */
  expiresAt?: Date;
}

export interface ExtendProfileArgs {
  tenantId: number;
  profileId: string;
  facts: FactInput[];
  repo: ProfileRepo;
  actor?: string;
}

export interface ExtendProfileResult {
  inserted: number;
  rejected: number;
  evicted: number;
}

export async function extendProfile(
  args: ExtendProfileArgs,
): Promise<ExtendProfileResult> {
  const { tenantId, profileId, facts, repo } = args;
  const actor = args.actor ?? 'system:agent';

  let inserted = 0;
  let rejected = 0;
  let evicted = 0;

  for (const f of facts) {
    if (f.category === 'sensitive') {
      rejected++;
      continue;
    }

    if (f.category === 'off_topic') {
      const count = await repo.countOffTopicFacts(tenantId, profileId);
      if (count >= FACT_OFF_TOPIC_CAP) {
        await repo.evictOldestOffTopic(
          tenantId,
          profileId,
          count - FACT_OFF_TOPIC_CAP + 1,
        );
        evicted += count - FACT_OFF_TOPIC_CAP + 1;
      }
    }

    await repo.insertFact({
      tenantId,
      profileId,
      category: f.category,
      key: f.key,
      value: f.value,
      source: f.source,
      confidence: f.confidence,
      expiresAt: f.expiresAt ?? defaultExpiryFor(f.category),
    });
    inserted++;
  }

  await repo.appendAuditLog({
    tenantId,
    actor,
    action: 'extend',
    targetProfileId: profileId,
    targetHash: createHash('sha256').update(profileId).digest('hex'),
    metadata: { inserted, rejected, evicted },
  });

  return { inserted, rejected, evicted };
}

function defaultExpiryFor(
  category: ProfileFactRow['category'],
): Date | undefined {
  // sensitive: 90 days (not used in v1 since we reject; future-proof)
  // off_topic: 365 days
  // others (preference/history/service_context/personal): null
  if (category === 'sensitive') {
    return new Date(Date.now() + 90 * MS_PER_DAY);
  }
  if (category === 'off_topic') {
    return new Date(Date.now() + 365 * MS_PER_DAY);
  }
  return undefined;
}
