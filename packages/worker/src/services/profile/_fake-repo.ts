/**
 * In-memory fake ProfileRepo for unit tests.
 *
 * Seeding API: tests call `repo.seedProfile({...})` to populate; the fake
 * records every call to touchLastSeen + appendAuditLog so assertions can
 * verify side effects.
 *
 * Not exported from index.ts — test-only.
 */

import { hashIdentifier } from './identity.js';
import type {
  AuditLogInput,
  ProfileConsentRow,
  ProfileIdentifierRow,
  ProfileRepo,
  ProfileRow,
} from './repo.js';

export interface SeedProfileInput {
  tenantId: number;
  profileId: string;
  identifiers: Array<{
    kind: ProfileIdentifierRow['kind'];
    value: string; // raw — fake hashes via identity.hashIdentifier
  }>;
  summary?: string;
  preferredChannel?: ProfileRow['preferredChannel'];
  displayName?: string;
  consent?: {
    granted: boolean;
    grantedAt?: Date;
    revokedAt?: Date;
    consentTextHash?: string;
    channel?: 'chat' | 'voice';
  };
}

export interface FakeProfileRepo extends ProfileRepo {
  seedProfile(input: SeedProfileInput): void;
  touchLastSeenCalls: Array<{ tenantId: number; profileId: string }>;
  auditLogCalls: AuditLogInput[];
  reset(): void;
}

export function createFakeProfileRepo(): FakeProfileRepo {
  const profiles = new Map<string, ProfileRow>();
  const identifiers: ProfileIdentifierRow[] = [];
  const consents = new Map<string, ProfileConsentRow>();
  const touchLastSeenCalls: Array<{ tenantId: number; profileId: string }> = [];
  const auditLogCalls: AuditLogInput[] = [];

  function profileKey(tenantId: number, profileId: string): string {
    return `${tenantId}:${profileId}`;
  }

  return {
    seedProfile(input) {
      profiles.set(profileKey(input.tenantId, input.profileId), {
        id: input.profileId,
        tenantId: input.tenantId,
        displayName: input.displayName ?? null,
        summary: input.summary ?? null,
        preferredChannel: input.preferredChannel ?? null,
        lastSeenAt: new Date(),
      });
      for (const ident of input.identifiers) {
        identifiers.push({
          profileId: input.profileId,
          tenantId: input.tenantId,
          kind: ident.kind,
          valueHash: hashIdentifier(ident.kind, ident.value),
        });
      }
      if (input.consent) {
        consents.set(profileKey(input.tenantId, input.profileId), {
          profileId: input.profileId,
          tenantId: input.tenantId,
          granted: input.consent.granted,
          channel: input.consent.channel ?? 'chat',
          consentTextHash: input.consent.consentTextHash ?? 'test-hash',
          grantedAt: input.consent.grantedAt ?? new Date(),
          revokedAt: input.consent.revokedAt ?? null,
        });
      }
    },

    async findProfileIdsByIdentifierHashes(tenantId, hashes) {
      const matched = new Set<string>();
      for (const row of identifiers) {
        if (row.tenantId !== tenantId) continue;
        for (const q of hashes) {
          if (row.kind === q.kind && row.valueHash === q.valueHash) {
            matched.add(row.profileId);
          }
        }
      }
      return Array.from(matched);
    },

    async getProfile(tenantId, profileId) {
      return profiles.get(profileKey(tenantId, profileId)) ?? null;
    },

    async getLatestConsent(tenantId, profileId) {
      return consents.get(profileKey(tenantId, profileId)) ?? null;
    },

    async touchLastSeen(tenantId, profileId) {
      touchLastSeenCalls.push({ tenantId, profileId });
      const key = profileKey(tenantId, profileId);
      const existing = profiles.get(key);
      if (existing) {
        existing.lastSeenAt = new Date();
      }
    },

    async appendAuditLog(entry) {
      auditLogCalls.push(entry);
    },

    touchLastSeenCalls,
    auditLogCalls,

    reset() {
      profiles.clear();
      identifiers.length = 0;
      consents.clear();
      touchLastSeenCalls.length = 0;
      auditLogCalls.length = 0;
    },
  };
}
