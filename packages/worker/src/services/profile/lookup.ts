/**
 * profileLookup — given a tenant + identity (phone / email / whatsapp / name),
 * find the matching profile, evaluate consent, and return a compact result
 * suitable for injection into an agent's system prompt.
 *
 * Pure orchestration: all data access goes through ProfileRepo so unit tests
 * can swap in an in-memory fake (see _fake-repo.ts).
 */

import { createHash } from 'node:crypto';
import {
  hashIdentifier,
  scoreIdentityConfidence,
  type Identity,
  type IdentifierKind,
} from './identity.js';
import type { ProfileRepo } from './repo.js';

export interface ProfileLookupResult {
  profile_id: string | null;
  confidence: number;
  consent_granted: boolean;
  summary: string | null;
  preferred_channel: 'chat' | 'voice' | 'whatsapp' | 'email' | null;
}

export interface ProfileLookupArgs {
  tenantId: number;
  identity: Identity;
  repo: ProfileRepo;
  /** Actor recorded on the audit-log entry. Default 'system:agent'. */
  actor?: string;
}

const EMPTY_RESULT: ProfileLookupResult = {
  profile_id: null,
  confidence: 0,
  consent_granted: false,
  summary: null,
  preferred_channel: null,
};

export async function profileLookup(
  args: ProfileLookupArgs,
): Promise<ProfileLookupResult> {
  const { tenantId, identity, repo } = args;
  const actor = args.actor ?? 'system:agent';

  const hashes = buildIdentifierHashes(identity);

  if (hashes.length === 0) {
    await repo.appendAuditLog({
      tenantId,
      actor,
      action: 'lookup',
      targetProfileId: null,
      metadata: { kinds: [] },
    });
    return EMPTY_RESULT;
  }

  // Probe the repo. We do not pass the raw identity — only hashes.
  const profileIds = await repo.findProfileIdsByIdentifierHashes(
    tenantId,
    hashes,
  );

  if (profileIds.length === 0) {
    await repo.appendAuditLog({
      tenantId,
      actor,
      action: 'lookup',
      targetProfileId: null,
      // Audit log records only the kinds queried, never the raw values.
      metadata: { kinds: hashes.map((h) => h.kind), result: 'miss' },
    });
    return EMPTY_RESULT;
  }

  // If multiple distinct profiles match (e.g. phone matches one,
  // email matches another), confidence drops. v1 picks the first profile;
  // the agent layer can disambiguate via a confirmation turn.
  const profileId = profileIds[0];

  const [profile, consent] = await Promise.all([
    repo.getProfile(tenantId, profileId),
    repo.getLatestConsent(tenantId, profileId),
  ]);

  if (!profile) {
    // Row vanished between identifier lookup and profile load — treat as miss.
    await repo.appendAuditLog({
      tenantId,
      actor,
      action: 'lookup',
      targetProfileId: null,
      metadata: { kinds: hashes.map((h) => h.kind), result: 'profile_missing' },
    });
    return EMPTY_RESULT;
  }

  // Confidence comes from the identity shape, not from match strength.
  // (Match strength is binary at the row level; confidence reflects how
  // much weight we should put on this being the same person.)
  const confidence = scoreIdentityConfidence(identity);

  const consentGranted = consent ? consent.granted && consent.revokedAt === null : false;

  // Side-effect: bump last_seen_at so retention math reflects this contact.
  await repo.touchLastSeen(tenantId, profileId);

  await repo.appendAuditLog({
    tenantId,
    actor,
    action: 'lookup',
    targetProfileId: profileId,
    targetHash: createHash('sha256').update(profileId).digest('hex'),
    metadata: {
      kinds: hashes.map((h) => h.kind),
      result: 'hit',
      consent_granted: consentGranted,
    },
  });

  return {
    profile_id: profileId,
    confidence,
    consent_granted: consentGranted,
    summary: consentGranted ? profile.summary : null,
    preferred_channel: consentGranted ? profile.preferredChannel : null,
  };
}

function buildIdentifierHashes(
  identity: Identity,
): Array<{ kind: IdentifierKind; valueHash: string }> {
  const out: Array<{ kind: IdentifierKind; valueHash: string }> = [];
  if (nonEmpty(identity.phone)) {
    out.push({
      kind: 'phone',
      valueHash: hashIdentifier('phone', identity.phone!),
    });
  }
  if (nonEmpty(identity.email)) {
    out.push({
      kind: 'email',
      valueHash: hashIdentifier('email', identity.email!),
    });
  }
  if (nonEmpty(identity.whatsapp)) {
    // WhatsApp is matched as a phone since callers may have stored their
    // number under either kind. The repo treats the hash space as kind-
    // scoped, so we probe BOTH 'phone' and 'whatsapp' kinds for the same
    // normalised value.
    out.push({
      kind: 'phone',
      valueHash: hashIdentifier('phone', identity.whatsapp!),
    });
    out.push({
      kind: 'whatsapp',
      valueHash: hashIdentifier('whatsapp', identity.whatsapp!),
    });
  }
  if (nonEmpty(identity.nameHint)) {
    out.push({
      kind: 'name_hint',
      valueHash: hashIdentifier('name_hint', identity.nameHint!),
    });
  }
  return out;
}

function nonEmpty(s: string | undefined): boolean {
  return typeof s === 'string' && s.trim().length > 0;
}
