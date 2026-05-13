import { describe, it, expect, beforeEach } from 'vitest';
import { forgetProfile } from './forget.js';
import {
  createFakeProfileRepo,
  type FakeProfileRepo,
} from './_fake-repo.js';

// ---------------------------------------------------------------------------
// forgetProfile — POPIA s.24 right-to-be-forgotten.
// Implements US-LG-040 (chat) and US-VA-047 (voice).
// ---------------------------------------------------------------------------

describe('forgetProfile', () => {
  let repo: FakeProfileRepo;

  beforeEach(() => {
    repo = createFakeProfileRepo();
  });

  it('hard-deletes profile + identifiers + facts + consents (by identity)', async () => {
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [
        { kind: 'phone', value: '+27821234567' },
        { kind: 'email', value: 'sipho@example.com' },
      ],
      consent: { granted: true },
      facts: [
        { category: 'preference', key: 'channel', value: 'whatsapp', source: 'user_stated' },
        { category: 'history', key: 'last_service', value: 'geyser leak', source: 'agent_inferred' },
      ],
    });

    const result = await forgetProfile({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });

    expect(result.deleted).toBe(true);
    expect(result.counts).toMatchObject({
      profile: 1,
      identifiers: 2,
      facts: 2,
      consents: 1,
    });
    expect(repo.getAllProfiles()).toHaveLength(0);
    expect(repo.getAllIdentifiers()).toHaveLength(0);
    expect(repo.getAllFacts()).toHaveLength(0);
    expect(repo.getAllConsents()).toHaveLength(0);
  });

  it('writes audit-log entry with action="forget" + no PII', async () => {
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
    });

    await forgetProfile({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
      actor: 'system:lead-gen',
    });

    expect(repo.auditLogCalls).toHaveLength(1);
    expect(repo.auditLogCalls[0]).toMatchObject({
      action: 'forget',
      tenantId: 1,
      actor: 'system:lead-gen',
    });
    const recorded = JSON.stringify(repo.auditLogCalls[0]);
    expect(recorded).not.toContain('+27821234567');
    expect(recorded).not.toContain('sipho@example.com');
  });

  it('idempotent — forgetting non-existent identity returns deleted=false, no errors', async () => {
    const result = await forgetProfile({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });
    expect(result.deleted).toBe(false);
    expect(result.counts).toMatchObject({
      profile: 0,
      identifiers: 0,
      facts: 0,
      consents: 0,
    });
    // Audit log still records the attempt
    expect(repo.auditLogCalls).toHaveLength(1);
    expect(repo.auditLogCalls[0]).toMatchObject({ action: 'forget' });
  });

  it('tenant isolation — cannot delete other tenant profile', async () => {
    repo.seedProfile({
      tenantId: 2,
      profileId: 'p-tenant-2',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
    });
    const result = await forgetProfile({
      tenantId: 1, // wrong tenant
      identity: { phone: '+27821234567' },
      repo,
    });
    expect(result.deleted).toBe(false);
    expect(repo.getAllProfiles()).toHaveLength(1); // tenant 2 row still present
    expect(repo.getAllIdentifiers()).toHaveLength(1);
  });

  it('accepts profileId directly when caller already has it (skip lookup)', async () => {
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
    });
    const result = await forgetProfile({
      tenantId: 1,
      profileId: 'p-1',
      repo,
    });
    expect(result.deleted).toBe(true);
    expect(repo.getAllProfiles()).toHaveLength(0);
  });

  it('audit-log metadata includes deletion counts (for ops review)', async () => {
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
      facts: [
        { category: 'preference', key: 'a', value: 1, source: 'user_stated' },
        { category: 'history', key: 'b', value: 2, source: 'agent_inferred' },
      ],
    });
    await forgetProfile({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });
    const meta = repo.auditLogCalls[0].metadata ?? {};
    expect(meta).toMatchObject({
      profile: 1,
      identifiers: 1,
      facts: 2,
      consents: 1,
    });
  });
});
