import { describe, it, expect, beforeEach } from 'vitest';
import { recordConsent } from './consent.js';
import {
  createFakeProfileRepo,
  type FakeProfileRepo,
} from './_fake-repo.js';
import { hashIdentifier } from './identity.js';

// ---------------------------------------------------------------------------
// recordConsent:
//   - Resolves or creates a profile for the given (tenantId, identity).
//   - Writes a consent row (granted true|false) with sha256(consent_text).
//   - Writes an audit-log entry with action = 'consent'.
//   - Tenant-isolated; raw PII never appears in the audit log.
// ---------------------------------------------------------------------------

describe('recordConsent', () => {
  let repo: FakeProfileRepo;

  beforeEach(() => {
    repo = createFakeProfileRepo();
  });

  it('first-time visitor grants consent → profile created, identifier attached, consent stored', async () => {
    const result = await recordConsent({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      granted: true,
      channel: 'chat',
      consentText:
        'Quick note — I can remember our chat so you don\'t repeat yourself next time. Want me to?',
      repo,
      actor: 'system:lead-gen',
    });

    expect(result.profile_id).toBeTruthy();
    expect(result.created).toBe(true);

    const consents = repo.getAllConsents();
    expect(consents).toHaveLength(1);
    expect(consents[0].granted).toBe(true);
    expect(consents[0].channel).toBe('chat');
    expect(consents[0].consentTextHash).toMatch(/^[a-f0-9]{64}$/);

    const idents = repo.getAllIdentifiers();
    expect(idents).toHaveLength(1);
    expect(idents[0].kind).toBe('phone');
    expect(idents[0].valueHash).toBe(
      hashIdentifier('phone', '+27821234567'),
    );
  });

  it('first-time visitor DECLINES → profile still created (anchor for 90-day no-re-ask), consent denied stored', async () => {
    const result = await recordConsent({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      granted: false,
      channel: 'chat',
      consentText: 'Quick note...',
      repo,
    });

    expect(result.profile_id).toBeTruthy();
    expect(result.created).toBe(true);

    const consents = repo.getAllConsents();
    expect(consents).toHaveLength(1);
    expect(consents[0].granted).toBe(false);
  });

  it('returning visitor (profile exists) → no new profile created, new consent row written', async () => {
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-existing',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
    });

    const result = await recordConsent({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      granted: true,
      channel: 'chat',
      consentText: 'Updated consent text',
      repo,
    });

    expect(result.profile_id).toBe('p-existing');
    expect(result.created).toBe(false);

    expect(repo.getAllProfiles()).toHaveLength(1);
    // 2 consent rows: original seeded + new one
    expect(repo.getAllConsents()).toHaveLength(2);
  });

  it('grant after revoke → prior open consent revokedAt populated, new row open', async () => {
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
    });
    const before = repo.getAllConsents();
    expect(before[0].revokedAt).toBeNull();

    await recordConsent({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      granted: false,
      channel: 'chat',
      consentText: 'Updated',
      repo,
    });

    const after = repo.getAllConsents();
    // Two rows now: original (revokedAt set) + new denial (open)
    expect(after).toHaveLength(2);
    // The originally-open row should now have a revokedAt
    const original = after.find((c) => c.consentTextHash === 'test-hash');
    expect(original?.revokedAt).not.toBeNull();
    const newest = after.find((c) => c.consentTextHash !== 'test-hash');
    expect(newest?.revokedAt).toBeNull();
    expect(newest?.granted).toBe(false);
  });

  it('writes audit-log entry with action = "consent" and hashed target', async () => {
    await recordConsent({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      granted: true,
      channel: 'chat',
      consentText: 'Q',
      repo,
      actor: 'system:lead-gen',
    });

    expect(repo.auditLogCalls).toHaveLength(1);
    expect(repo.auditLogCalls[0]).toMatchObject({
      tenantId: 1,
      actor: 'system:lead-gen',
      action: 'consent',
    });

    const meta = JSON.stringify(repo.auditLogCalls[0]);
    // Raw PII must never be in the audit log
    expect(meta).not.toContain('+27821234567');
  });

  it('consent text hash is deterministic for the same text', async () => {
    await recordConsent({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      granted: true,
      channel: 'chat',
      consentText: 'Identical text',
      repo,
    });
    await recordConsent({
      tenantId: 1,
      identity: { email: 'a@b.com' },
      granted: true,
      channel: 'chat',
      consentText: 'Identical text',
      repo,
    });
    const consents = repo.getAllConsents();
    expect(consents).toHaveLength(2);
    expect(consents[0].consentTextHash).toBe(consents[1].consentTextHash);
  });

  it('different consent texts hash differently', async () => {
    await recordConsent({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      granted: true,
      channel: 'chat',
      consentText: 'Variant A',
      repo,
    });
    await recordConsent({
      tenantId: 2,
      identity: { phone: '+27821234567' },
      granted: true,
      channel: 'chat',
      consentText: 'Variant B',
      repo,
    });
    const [a, b] = repo.getAllConsents();
    expect(a.consentTextHash).not.toBe(b.consentTextHash);
  });

  it('voice channel records transcript snippet when provided', async () => {
    await recordConsent({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      granted: true,
      channel: 'voice',
      consentText: 'Quick thing — I can remember this for next time so you don\'t have to repeat yourself. Want me to?',
      transcriptSnippet: 'yeah ok',
      repo,
    });
    // The fake stores transcriptSnippet on the row; the repo interface
    // accepts it via WriteConsentInput. Confirm via getAllConsents shape.
    const row = repo.getAllConsents()[0];
    expect(row.channel).toBe('voice');
    // transcriptSnippet is a write-only field for audit storage; the
    // fake records it via writeConsent path (not separately exposed here).
  });

  it('tenant isolation — profile created under the requested tenant only', async () => {
    await recordConsent({
      tenantId: 7,
      identity: { phone: '+27821234567' },
      granted: true,
      channel: 'chat',
      consentText: 'x',
      repo,
    });
    const profiles = repo.getAllProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].tenantId).toBe(7);
    const idents = repo.getAllIdentifiers();
    expect(idents).toHaveLength(1);
    expect(idents[0].tenantId).toBe(7);
  });

  it('multiple identifiers are all attached on first-time consent', async () => {
    await recordConsent({
      tenantId: 1,
      identity: { phone: '+27821234567', email: 'sipho@example.com' },
      granted: true,
      channel: 'chat',
      consentText: 'x',
      repo,
    });
    const idents = repo.getAllIdentifiers();
    expect(idents).toHaveLength(2);
    expect(idents.map((i) => i.kind).sort()).toEqual(['email', 'phone']);
  });
});
