/**
 * forgetProfile — POPIA s.24 right-to-be-forgotten.
 *
 * Hard-deletes everything for a profile: profile row, identifiers, facts,
 * consents. The audit log retains a record of the deletion (without the PII
 * — the spec is clear that the audit log persists in PII-redacted form).
 *
 * Two call shapes:
 *   1. { identity } — service looks up the profile by identifier first.
 *   2. { profileId } — caller already has the id (skip lookup).
 *
 * Idempotent: forgetting a non-existent identifier returns deleted=false
 * with zero counts and still writes an audit-log entry.
 */

import { createHash } from 'node:crypto';
import {
  hashIdentifier,
  type Identity,
  type IdentifierKind,
} from './identity.js';
import type { ForgetCounts, ProfileRepo } from './repo.js';

export interface ForgetByIdentity {
  tenantId: number;
  identity: Identity;
  profileId?: never;
  repo: ProfileRepo;
  actor?: string;
}

export interface ForgetByProfileId {
  tenantId: number;
  identity?: never;
  profileId: string;
  repo: ProfileRepo;
  actor?: string;
}

export type ForgetProfileArgs = ForgetByIdentity | ForgetByProfileId;

export interface ForgetProfileResult {
  deleted: boolean;
  counts: ForgetCounts;
}

const ZERO_COUNTS: ForgetCounts = {
  profile: 0,
  identifiers: 0,
  facts: 0,
  consents: 0,
};

export async function forgetProfile(
  args: ForgetProfileArgs,
): Promise<ForgetProfileResult> {
  const { tenantId, repo } = args;
  const actor = args.actor ?? 'system:agent';

  // Resolve profile id
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
      if (found.length > 0) {
        profileId = found[0];
      }
    }
  }

  if (profileId === null) {
    // Nothing to delete — still record the attempt.
    await repo.appendAuditLog({
      tenantId,
      actor,
      action: 'forget',
      targetProfileId: null,
      metadata: { result: 'miss', ...ZERO_COUNTS },
    });
    return { deleted: false, counts: ZERO_COUNTS };
  }

  const counts = await repo.deleteAllProfileData(tenantId, profileId);

  await repo.appendAuditLog({
    tenantId,
    actor,
    action: 'forget',
    targetProfileId: null, // deleted — don't keep the live id around
    targetHash: createHash('sha256').update(profileId).digest('hex'),
    metadata: { result: 'deleted', ...counts },
  });

  const anyDeleted =
    counts.profile > 0 ||
    counts.identifiers > 0 ||
    counts.facts > 0 ||
    counts.consents > 0;

  return { deleted: anyDeleted, counts };
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
