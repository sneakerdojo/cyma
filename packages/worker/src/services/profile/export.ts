/**
 * exportProfileData — POPIA s.23 subject access request.
 *
 * Returns the full structured payload for a profile (its row + identifiers
 * + facts + consents). In production an operator wraps this into a signed
 * ZIP and emails the URL to the data subject within the POPIA 30-day SLA.
 *
 * Tenant-scoped. Idempotent. Audit-logged.
 */

import { createHash } from 'node:crypto';
import {
  hashIdentifier,
  type Identity,
  type IdentifierKind,
} from './identity.js';
import type { ProfileExportPayload, ProfileRepo } from './repo.js';

export interface ExportByIdentity {
  tenantId: number;
  identity: Identity;
  profileId?: never;
  repo: ProfileRepo;
  actor?: string;
}

export interface ExportByProfileId {
  tenantId: number;
  identity?: never;
  profileId: string;
  repo: ProfileRepo;
  actor?: string;
}

export type ExportProfileArgs = ExportByIdentity | ExportByProfileId;

export interface ExportProfileResult {
  found: boolean;
  payload: ProfileExportPayload;
}

const EMPTY_PAYLOAD: ProfileExportPayload = {
  profile: null,
  identifiers: [],
  facts: [],
  consents: [],
};

export async function exportProfileData(
  args: ExportProfileArgs,
): Promise<ExportProfileResult> {
  const { tenantId, repo } = args;
  const actor = args.actor ?? 'operator:unknown';

  let profileId: string | null = null;

  if ('profileId' in args && args.profileId) {
    profileId = args.profileId;
  } else if ('identity' in args && args.identity) {
    const hashes = buildIdentifierHashes(args.identity);
    if (hashes.length > 0) {
      const found = await repo.findProfileIdsByIdentifierHashes(
        tenantId,
        hashes,
      );
      if (found.length > 0) profileId = found[0];
    }
  }

  if (profileId === null) {
    await repo.appendAuditLog({
      tenantId,
      actor,
      action: 'export',
      targetProfileId: null,
      metadata: { result: 'miss' },
    });
    return { found: false, payload: EMPTY_PAYLOAD };
  }

  const payload = await repo.exportProfile(tenantId, profileId);

  // If the repo returned a payload but with a missing profile row, treat as
  // not-found (defensive: handles race between identifier lookup + export).
  if (payload.profile === null) {
    await repo.appendAuditLog({
      tenantId,
      actor,
      action: 'export',
      targetProfileId: null,
      metadata: { result: 'profile_missing' },
    });
    return { found: false, payload: EMPTY_PAYLOAD };
  }

  await repo.appendAuditLog({
    tenantId,
    actor,
    action: 'export',
    targetProfileId: profileId,
    targetHash: createHash('sha256').update(profileId).digest('hex'),
    metadata: {
      result: 'exported',
      identifiers: payload.identifiers.length,
      facts: payload.facts.length,
      consents: payload.consents.length,
    },
  });

  return { found: true, payload };
}

function buildIdentifierHashes(
  identity: Identity,
): Array<{ kind: IdentifierKind; valueHash: string }> {
  const out: Array<{ kind: IdentifierKind; valueHash: string }> = [];
  if (nonEmpty(identity.phone)) {
    out.push({ kind: 'phone', valueHash: hashIdentifier('phone', identity.phone!) });
  }
  if (nonEmpty(identity.email)) {
    out.push({ kind: 'email', valueHash: hashIdentifier('email', identity.email!) });
  }
  if (nonEmpty(identity.whatsapp)) {
    out.push({ kind: 'whatsapp', valueHash: hashIdentifier('whatsapp', identity.whatsapp!) });
    out.push({ kind: 'phone', valueHash: hashIdentifier('phone', identity.whatsapp!) });
  }
  if (nonEmpty(identity.nameHint)) {
    out.push({ kind: 'name_hint', valueHash: hashIdentifier('name_hint', identity.nameHint!) });
  }
  return out;
}

function nonEmpty(s: string | undefined): boolean {
  return typeof s === 'string' && s.trim().length > 0;
}
