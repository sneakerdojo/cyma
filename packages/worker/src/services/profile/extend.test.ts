import { describe, it, expect, beforeEach } from 'vitest';
import { extendProfile, FACT_OFF_TOPIC_CAP } from './extend.js';
import {
  createFakeProfileRepo,
  type FakeProfileRepo,
} from './_fake-repo.js';

// ---------------------------------------------------------------------------
// extendProfile writes facts to a profile. It enforces two policy rules from
// docs/superpowers/specs/2026-05-13-profile-system.md:
//   1. category='sensitive' is NEVER auto-captured in v1 (spec §"Sensitive
//      bucket requires explicit per-mention consent in v3").
//   2. category='off_topic' is capped at FACT_OFF_TOPIC_CAP (20) per profile;
//      oldest evicted when over.
// Also: per-category default TTL is applied (sensitive 90d / off_topic 12mo
// / others null).
// ---------------------------------------------------------------------------

describe('extendProfile', () => {
  let repo: FakeProfileRepo;
  const PROFILE = 'p-1';

  beforeEach(() => {
    repo = createFakeProfileRepo();
    repo.seedProfile({
      tenantId: 1,
      profileId: PROFILE,
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
    });
  });

  it('inserts a preference fact', async () => {
    await extendProfile({
      tenantId: 1,
      profileId: PROFILE,
      facts: [
        {
          category: 'preference',
          key: 'preferred_channel',
          value: 'whatsapp',
          source: 'user_stated',
        },
      ],
      repo,
    });
    const stored = repo.getAllFacts();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      category: 'preference',
      key: 'preferred_channel',
      value: 'whatsapp',
      source: 'user_stated',
    });
  });

  it('REJECTS sensitive facts (does not store; logs reason)', async () => {
    const result = await extendProfile({
      tenantId: 1,
      profileId: PROFILE,
      facts: [
        {
          category: 'sensitive',
          key: 'health_context',
          value: 'cancer treatment',
          source: 'user_stated',
        },
      ],
      repo,
    });
    expect(repo.getAllFacts()).toHaveLength(0);
    expect(result.rejected).toBeGreaterThan(0);
    expect(result.inserted).toBe(0);
  });

  it('mixes accepted + rejected — inserts the accepted, rejects sensitive', async () => {
    const result = await extendProfile({
      tenantId: 1,
      profileId: PROFILE,
      facts: [
        { category: 'preference', key: 'channel', value: 'whatsapp', source: 'user_stated' },
        { category: 'sensitive', key: 'health', value: 'private', source: 'user_stated' },
        { category: 'history', key: 'last_service', value: 'geyser leak', source: 'agent_inferred' },
      ],
      repo,
    });
    expect(result.inserted).toBe(2);
    expect(result.rejected).toBe(1);
    const stored = repo.getAllFacts();
    expect(stored.map((f) => f.category).sort()).toEqual(['history', 'preference']);
  });

  it('off_topic cap = 20 — over-cap insert evicts oldest before inserting', async () => {
    // Pre-seed with 20 off_topic facts.
    const existing = Array.from({ length: 20 }, (_, i) => ({
      category: 'off_topic' as const,
      key: `topic_${i}`,
      value: `value_${i}`,
      source: 'user_stated' as const,
    }));
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-cap',
      identifiers: [],
      facts: existing,
    });

    const before = repo.getAllFacts().filter((f) => f.profileId === 'p-cap');
    expect(before).toHaveLength(20);

    await extendProfile({
      tenantId: 1,
      profileId: 'p-cap',
      facts: [
        { category: 'off_topic', key: 'newest', value: 'startup idea', source: 'user_stated' },
      ],
      repo,
    });

    const after = repo.getAllFacts().filter((f) => f.profileId === 'p-cap');
    expect(after).toHaveLength(20); // still 20
    expect(after.some((f) => f.key === 'newest')).toBe(true);
    expect(after.some((f) => f.key === 'topic_0')).toBe(false); // oldest evicted
  });

  it('applies per-category default TTLs (off_topic 12 months, others null)', async () => {
    const before = Date.now();
    await extendProfile({
      tenantId: 1,
      profileId: PROFILE,
      facts: [
        { category: 'off_topic', key: 'a', value: 1, source: 'user_stated' },
        { category: 'preference', key: 'b', value: 2, source: 'user_stated' },
      ],
      repo,
    });
    const stored = repo.getAllFacts().sort((a, b) => a.key.localeCompare(b.key));
    // off_topic gets ~365 days expiry
    expect(stored[0].expiresAt).not.toBeNull();
    const offTopicTtlMs = stored[0].expiresAt!.getTime() - before;
    expect(offTopicTtlMs).toBeGreaterThan(360 * 24 * 60 * 60 * 1000);
    expect(offTopicTtlMs).toBeLessThan(370 * 24 * 60 * 60 * 1000);
    // preference category — no expiry by default
    expect(stored[1].expiresAt).toBeNull();
  });

  it('writes one audit-log row per extend call (not per fact)', async () => {
    await extendProfile({
      tenantId: 1,
      profileId: PROFILE,
      facts: [
        { category: 'preference', key: 'a', value: 1, source: 'user_stated' },
        { category: 'history', key: 'b', value: 2, source: 'agent_inferred' },
        { category: 'sensitive', key: 'c', value: 3, source: 'user_stated' }, // rejected
      ],
      repo,
      actor: 'system:lead-gen',
    });
    expect(repo.auditLogCalls).toHaveLength(1);
    expect(repo.auditLogCalls[0]).toMatchObject({
      action: 'extend',
      targetProfileId: PROFILE,
      tenantId: 1,
      actor: 'system:lead-gen',
    });
    const meta = repo.auditLogCalls[0].metadata ?? {};
    expect(meta).toMatchObject({ inserted: 2, rejected: 1 });
  });

  it('tenant isolation — facts written under requested tenant only', async () => {
    repo.seedProfile({
      tenantId: 2,
      profileId: 'p-tenant-2',
      identifiers: [],
      consent: { granted: true },
    });
    await extendProfile({
      tenantId: 2,
      profileId: 'p-tenant-2',
      facts: [{ category: 'preference', key: 'x', value: 1, source: 'user_stated' }],
      repo,
    });
    const stored = repo.getAllFacts();
    expect(stored.every((f) => f.tenantId === 2)).toBe(true);
  });

  it('empty facts → no insert, no eviction; still audit-logs the call', async () => {
    const result = await extendProfile({
      tenantId: 1,
      profileId: PROFILE,
      facts: [],
      repo,
    });
    expect(result).toEqual({ inserted: 0, rejected: 0, evicted: 0 });
    expect(repo.auditLogCalls).toHaveLength(1);
  });

  it('cap constant is 20 (matches spec)', () => {
    expect(FACT_OFF_TOPIC_CAP).toBe(20);
  });
});
