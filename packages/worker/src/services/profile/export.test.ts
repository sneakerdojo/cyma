import { describe, it, expect, beforeEach } from 'vitest';
import { exportProfileData } from './export.js';
import {
  createFakeProfileRepo,
  type FakeProfileRepo,
} from './_fake-repo.js';

// ---------------------------------------------------------------------------
// exportProfileData — POPIA s.23 subject access request.
// Implements US-LG-044 (chat) + US-AT-024 (audit-tool variant share schema).
//
// Returns a structured payload of everything we hold for that identity.
// In production an operator emails the visitor a signed URL to a generated
// ZIP; this service produces the payload + writes the audit-log entry.
// ---------------------------------------------------------------------------

describe('exportProfileData', () => {
  let repo: FakeProfileRepo;

  beforeEach(() => {
    repo = createFakeProfileRepo();
  });

  it('returns full payload (profile + identifiers + facts + consents)', async () => {
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
      ],
    });

    const result = await exportProfileData({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });

    expect(result.found).toBe(true);
    expect(result.payload.profile?.id).toBe('p-1');
    expect(result.payload.identifiers).toHaveLength(2);
    expect(result.payload.facts).toHaveLength(1);
    expect(result.payload.consents).toHaveLength(1);
  });

  it('returns found=false + empty payload when identity has no profile', async () => {
    const result = await exportProfileData({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });
    expect(result.found).toBe(false);
    expect(result.payload.profile).toBeNull();
    expect(result.payload.identifiers).toEqual([]);
    expect(result.payload.facts).toEqual([]);
    expect(result.payload.consents).toEqual([]);
  });

  it('writes audit-log entry with action="export" + no PII', async () => {
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
    });
    await exportProfileData({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
      actor: 'operator:founder@octio.co.za',
    });
    expect(repo.auditLogCalls).toHaveLength(1);
    expect(repo.auditLogCalls[0]).toMatchObject({
      action: 'export',
      actor: 'operator:founder@octio.co.za',
    });
    const meta = JSON.stringify(repo.auditLogCalls[0]);
    expect(meta).not.toContain('+27821234567');
  });

  it('tenant isolation — cannot export other tenant data', async () => {
    repo.seedProfile({
      tenantId: 2,
      profileId: 'p-tenant-2',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
    });
    const result = await exportProfileData({
      tenantId: 1,
      identity: { phone: '+27821234567' },
      repo,
    });
    expect(result.found).toBe(false);
  });

  it('accepts profileId directly when caller already has it', async () => {
    repo.seedProfile({
      tenantId: 1,
      profileId: 'p-1',
      identifiers: [{ kind: 'phone', value: '+27821234567' }],
      consent: { granted: true },
    });
    const result = await exportProfileData({
      tenantId: 1,
      profileId: 'p-1',
      repo,
    });
    expect(result.found).toBe(true);
    expect(result.payload.profile?.id).toBe('p-1');
  });
});
