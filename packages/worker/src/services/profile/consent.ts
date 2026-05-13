/**
 * recordConsent — persists a consent decision against a profile.
 *
 * - Resolves the profile via identity (first looks up; creates if missing).
 * - Hashes the exact consent text shown (sha256) for audit evidence.
 * - Writes a new consent row. The repo handles superseding any prior open
 *   consent (revokedAt was null → set to now).
 * - Appends an audit-log entry with action='consent'.
 *
 * The "decline still creates a profile" pattern is deliberate: we need a
 * persistence anchor for the 90-day no-re-ask rule (US-LG-038 / US-VA-045).
 * The empty-profile row stores only the decline + identifier_hashes; no
 * facts, no summary.
 */

import { createHash } from 'node:crypto';
import {
  hashIdentifier,
  type Identity,
  type IdentifierKind,
} from './identity.js';
import type { ProfileRepo } from './repo.js';

export interface RecordConsentArgs {
  tenantId: number;
  identity: Identity;
  granted: boolean;
  channel: 'chat' | 'voice';
  /** Exact text shown to / spoken to the user. Hashed for audit. */
  consentText: string;
  /** For voice, the transcript snippet of the response. Optional. */
  transcriptSnippet?: string;
  /** Hashed IP (chat) or caller-ID (voice) for audit. Optional. */
  ipOrCallerIdHash?: string;
  repo: ProfileRepo;
  /** Audit actor. Default 'system:agent'. */
  actor?: string;
}

export interface RecordConsentResult {
  profile_id: string;
  created: boolean;
}

export async function recordConsent(
  args: RecordConsentArgs,
): Promise<RecordConsentResult> {
  const {
    tenantId,
    identity,
    granted,
    channel,
    consentText,
    transcriptSnippet,
    ipOrCallerIdHash,
    repo,
  } = args;
  const actor = args.actor ?? 'system:agent';

  const identifierSet = buildIdentifierSet(identity);

  // Step 1: Resolve or create the profile.
  let profileId: string | null = null;
  let created = false;

  if (identifierSet.length > 0) {
    const existing = await repo.findProfileIdsByIdentifierHashes(
      tenantId,
      identifierSet.map(({ kind, valueHash }) => ({ kind, valueHash })),
    );
    if (existing.length > 0) {
      profileId = existing[0];
    }
  }

  if (profileId === null) {
    profileId = await repo.createProfile({ tenantId });
    created = true;
    // Attach all provided identifiers.
    for (const ident of identifierSet) {
      await repo.addIdentifier({
        tenantId,
        profileId,
        kind: ident.kind,
        valueHash: ident.valueHash,
        value: ident.value,
      });
    }
  }

  // Step 2: Write the consent row.
  const consentTextHash = hashConsentText(consentText);
  await repo.writeConsent({
    tenantId,
    profileId,
    granted,
    channel,
    consentTextHash,
    transcriptSnippet,
    ipOrCallerIdHash,
  });

  // Step 3: Audit log.
  await repo.appendAuditLog({
    tenantId,
    actor,
    action: 'consent',
    targetProfileId: profileId,
    targetHash: createHash('sha256').update(profileId).digest('hex'),
    metadata: {
      granted,
      channel,
      created_profile: created,
      kinds: identifierSet.map((i) => i.kind),
    },
  });

  return { profile_id: profileId, created };
}

function hashConsentText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

interface ResolvedIdentifier {
  kind: IdentifierKind;
  valueHash: string;
  value: string;
}

function buildIdentifierSet(identity: Identity): ResolvedIdentifier[] {
  const out: ResolvedIdentifier[] = [];
  if (nonEmpty(identity.phone)) {
    out.push({
      kind: 'phone',
      valueHash: hashIdentifier('phone', identity.phone!),
      value: identity.phone!,
    });
  }
  if (nonEmpty(identity.email)) {
    out.push({
      kind: 'email',
      valueHash: hashIdentifier('email', identity.email!),
      value: identity.email!.trim().toLowerCase(),
    });
  }
  if (nonEmpty(identity.whatsapp)) {
    out.push({
      kind: 'whatsapp',
      valueHash: hashIdentifier('whatsapp', identity.whatsapp!),
      value: identity.whatsapp!,
    });
  }
  if (nonEmpty(identity.nameHint)) {
    out.push({
      kind: 'name_hint',
      valueHash: hashIdentifier('name_hint', identity.nameHint!),
      value: identity.nameHint!,
    });
  }
  return out;
}

function nonEmpty(s: string | undefined): boolean {
  return typeof s === 'string' && s.trim().length > 0;
}
