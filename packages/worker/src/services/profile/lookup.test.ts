import { describe, it, expect } from 'vitest';
import { profileLookup } from './lookup.js';
import { createFakeProfileRepo } from './_fake-repo.js';

// ---------------------------------------------------------------------------
// profileLookup orchestrates: hash identifiers → find profile via repo →
// load consent → return ProfileLookupResult. Pure orchestration; no DB.
//
// Tests use an in-memory fake repo (./_fake-repo.ts) so we can exercise
// the matching logic without Drizzle.
// ---------------------------------------------------------------------------

describe('profileLookup', () => {
  it('returns null profile_id when no identifiers are provided', async () => {
    const repo = createFakeProfileRepo();
    const result = await profileLookup({
      tenantId: 1,
      identity: {},
      repo,
    });
    expect(result.profile_id).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.consent_granted).toBe(false);
    expect(result.summary).toBeNull();
  });

  it('returns null profile_id when no match exists for the given phone', async () => {
    const repo = createFakeProfileRepo();
    const result = await profileLookup({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });
    expect(result.profile_id).toBeNull();
    expect(result.confidence).toBe(0); // no match → no confidence
  });

  it('returns profile + 0.85 confidence on phone-only match', async () => {
    const repo = createFakeProfileRepo();
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      summary: 'Sipho, prefers WhatsApp',
      consent: { granted: true },
      preferredChannel: 'whatsapp',
    });

    const result = await profileLookup({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });

    expect(result.profile_id).toBe('p-1');
    expect(result.confidence).toBe(0.85);
    expect(result.consent_granted).toBe(true);
    expect(result.summary).toBe('Sipho, prefers WhatsApp');
    expect(result.preferred_channel).toBe('whatsapp');
  });

  it('returns 0.99 confidence on phone + email both matching the same profile', async () => {
    const repo = createFakeProfileRepo();
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [
        { kind: 'phone', value: '+27821234567' },
        { kind: 'email', value: 'sipho@example.com' },
      ],
      consent: { granted: true },
    });

    const result = await profileLookup({
      tenantId: 1,
      identity: { phone: '+27821234567', email: 'sipho@example.com' },
      repo,
    });

    expect(result.profile_id).toBe('p-1');
    expect(result.confidence).toBe(0.99);
  });

  it('treats whatsapp as phone-equivalent for matching', async () => {
    const repo = createFakeProfileRepo();
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
    });

    const result = await profileLookup({
      tenantId: 1,
      identity: { whatsapp: '+27821234567' },
      repo,
    });

    expect(result.profile_id).toBe('p-1');
    expect(result.confidence).toBe(0.85);
  });

  it('strictly isolates by tenant — Tenant A query never returns Tenant B profile', async () => {
    const repo = createFakeProfileRepo();
    repo.seedProfile({
      tenantId: 2,
      profileId: 'p-tenant-2',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
    });

    const result = await profileLookup({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });

    expect(result.profile_id).toBeNull();
  });

  it('returns consent_granted = false when profile has no consent record', async () => {
    const repo = createFakeProfileRepo();
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      // no consent seeded
    });

    const result = await profileLookup({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });

    expect(result.profile_id).toBe('p-1');
    expect(result.consent_granted).toBe(false);
    expect(result.summary).toBeNull(); // no summary loaded if no consent
  });

  it('returns consent_granted = false when consent was revoked', async () => {
    const repo = createFakeProfileRepo();
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true, revokedAt: new Date('2026-04-01') },
      summary: 'should not appear',
    });

    const result = await profileLookup({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });

    expect(result.consent_granted).toBe(false);
    expect(result.summary).toBeNull();
  });

  it('updates last_seen_at on hit (side effect via repo.touchLastSeen)', async () => {
    const repo = createFakeProfileRepo();
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
    });

    await profileLookup({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });

    expect(repo.touchLastSeenCalls).toContainEqual({
      tenantId: 1,
      profileId: 'p-1',
    });
  });

  it('writes an audit-log row for every lookup', async () => {
    const repo = createFakeProfileRepo();
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
    });

    await profileLookup({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
      actor: 'system:lead-gen',
    });

    expect(repo.auditLogCalls).toHaveLength(1);
    expect(repo.auditLogCalls[0]).toMatchObject({
      tenantId: 1,
      actor: 'system:lead-gen',
      action: 'lookup',
      targetProfileId: 'p-1',
    });
    // Raw PII must never appear in the audit log
    const meta = repo.auditLogCalls[0].metadata ?? {};
    expect(JSON.stringify(meta)).not.toContain('+27821234567');
    expect(JSON.stringify(meta)).not.toContain('sipho@example.com');
  });

  it('writes an audit-log row even when no profile matches', async () => {
    const repo = createFakeProfileRepo();
    await profileLookup({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
      actor: 'system:lead-gen',
    });
    expect(repo.auditLogCalls).toHaveLength(1);
    expect(repo.auditLogCalls[0]).toMatchObject({
      action: 'lookup',
      targetProfileId: null,
    });
  });
});
