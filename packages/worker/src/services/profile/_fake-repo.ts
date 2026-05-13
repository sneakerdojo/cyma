/**
 * In-memory fake ProfileRepo for unit tests.
 *
 * Seeding API: tests call `repo.seedProfile({...})` to populate; the fake
 * records every call to touchLastSeen + appendAuditLog so assertions can
 * verify side effects.
 *
 * Not exported from index.ts — test-only.
 */

import { randomUUID } from 'node:crypto';
import { hashIdentifier } from './identity.js';
import type {
  AddIdentifierInput,
  AuditLogInput,
  CreateProfileInput,
  ForgetCounts,
  InsertFactInput,
  ProfileConsentRow,
  ProfileExportPayload,
  ProfileFactRow,
  ProfileIdentifierRow,
  ProfileRepo,
  ProfileRow,
  WriteConsentInput,
} from './repo.js';

export interface SeedProfileInput {
  tenantId: number;
  profileId: string;
  identifiers: Array<{
    kind: ProfileIdentifierRow['kind'];
    value: string;
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
  facts?: Array<{
    category: ProfileFactRow['category'];
    key: string;
    value: unknown;
    source?: ProfileFactRow['source'];
    confidence?: number;
    expiresAt?: Date;
  }>;
}

export interface FakeProfileRepo extends ProfileRepo {
  seedProfile(input: SeedProfileInput): void;
  touchLastSeenCalls: Array<{ tenantId: number; profileId: string }>;
  auditLogCalls: AuditLogInput[];
  reset(): void;

  // Inspection helpers (test-only)
  getAllProfiles(): ProfileRow[];
  getAllIdentifiers(): ProfileIdentifierRow[];
  getAllConsents(): ProfileConsentRow[];
  getAllFacts(): ProfileFactRow[];
}

export function createFakeProfileRepo(): FakeProfileRepo {
  const profiles = new Map<string, ProfileRow>();
  const identifiers: ProfileIdentifierRow[] = [];
  // Multiple consent rows per profile possible (grants + revocations over time).
  const consents: ProfileConsentRow[] = [];
  const facts: ProfileFactRow[] = [];
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
        consents.push({
          profileId: input.profileId,
          tenantId: input.tenantId,
          granted: input.consent.granted,
          channel: input.consent.channel ?? 'chat',
          consentTextHash: input.consent.consentTextHash ?? 'test-hash',
          grantedAt: input.consent.grantedAt ?? new Date(),
          revokedAt: input.consent.revokedAt ?? null,
        });
      }
      if (input.facts) {
        for (const f of input.facts) {
          facts.push({
            id: randomUUID(),
            profileId: input.profileId,
            tenantId: input.tenantId,
            category: f.category,
            key: f.key,
            value: f.value,
            source: f.source ?? 'user_stated',
            confidence: String(f.confidence ?? 1.0),
            createdAt: new Date(),
            expiresAt: f.expiresAt ?? null,
          });
        }
      }
    },

    // ── Read ───────────────────────────────────────────────────────────────
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
      // Latest by grantedAt
      const rows = consents
        .filter((c) => c.tenantId === tenantId && c.profileId === profileId)
        .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime());
      return rows[0] ?? null;
    },

    async listFacts(tenantId, profileId) {
      return facts.filter(
        (f) => f.tenantId === tenantId && f.profileId === profileId,
      );
    },

    async exportProfile(tenantId, profileId): Promise<ProfileExportPayload> {
      const profile = profiles.get(profileKey(tenantId, profileId)) ?? null;
      return {
        profile,
        identifiers: identifiers.filter(
          (i) => i.tenantId === tenantId && i.profileId === profileId,
        ),
        facts: facts.filter(
          (f) => f.tenantId === tenantId && f.profileId === profileId,
        ),
        consents: consents.filter(
          (c) => c.tenantId === tenantId && c.profileId === profileId,
        ),
      };
    },

    // ── Write ──────────────────────────────────────────────────────────────
    async createProfile(input: CreateProfileInput) {
      const id = randomUUID();
      profiles.set(profileKey(input.tenantId, id), {
        id,
        tenantId: input.tenantId,
        displayName: input.displayName ?? null,
        summary: input.summary ?? null,
        preferredChannel: input.preferredChannel ?? null,
        lastSeenAt: new Date(),
      });
      return id;
    },

    async addIdentifier(input: AddIdentifierInput) {
      identifiers.push({
        profileId: input.profileId,
        tenantId: input.tenantId,
        kind: input.kind,
        valueHash: input.valueHash,
      });
    },

    async markIdentifierSuperseded(tenantId, profileId, kind, valueHash) {
      // No-op for the fake; in production this writes superseded_at.
      // Recorded as a side-effect for assertions if needed in the future.
      void tenantId;
      void profileId;
      void kind;
      void valueHash;
    },

    async touchLastSeen(tenantId, profileId) {
      touchLastSeenCalls.push({ tenantId, profileId });
      const key = profileKey(tenantId, profileId);
      const existing = profiles.get(key);
      if (existing) {
        existing.lastSeenAt = new Date();
      }
    },

    async writeConsent(input: WriteConsentInput) {
      // Mark any prior open consent rows as revoked.
      for (const c of consents) {
        if (
          c.tenantId === input.tenantId &&
          c.profileId === input.profileId &&
          c.revokedAt === null
        ) {
          c.revokedAt = new Date();
        }
      }
      consents.push({
        tenantId: input.tenantId,
        profileId: input.profileId,
        granted: input.granted,
        channel: input.channel,
        consentTextHash: input.consentTextHash,
        grantedAt: new Date(),
        revokedAt: null,
      });
    },

    async insertFact(input: InsertFactInput) {
      facts.push({
        id: randomUUID(),
        profileId: input.profileId,
        tenantId: input.tenantId,
        category: input.category,
        key: input.key,
        value: input.value,
        source: input.source,
        confidence: String(input.confidence ?? 1.0),
        createdAt: new Date(),
        expiresAt: input.expiresAt ?? null,
      });
    },

    async countOffTopicFacts(tenantId, profileId) {
      return facts.filter(
        (f) =>
          f.tenantId === tenantId &&
          f.profileId === profileId &&
          f.category === 'off_topic',
      ).length;
    },

    async evictOldestOffTopic(tenantId, profileId, n) {
      const matching = facts
        .filter(
          (f) =>
            f.tenantId === tenantId &&
            f.profileId === profileId &&
            f.category === 'off_topic',
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const toEvict = matching.slice(0, n);
      for (const evicted of toEvict) {
        const idx = facts.indexOf(evicted);
        if (idx >= 0) facts.splice(idx, 1);
      }
    },

    async deleteAllProfileData(tenantId, profileId): Promise<ForgetCounts> {
      let deletedFacts = 0;
      let deletedIdentifiers = 0;
      let deletedConsents = 0;
      let deletedProfile = 0;

      for (let i = facts.length - 1; i >= 0; i--) {
        if (
          facts[i].tenantId === tenantId &&
          facts[i].profileId === profileId
        ) {
          facts.splice(i, 1);
          deletedFacts++;
        }
      }
      for (let i = identifiers.length - 1; i >= 0; i--) {
        if (
          identifiers[i].tenantId === tenantId &&
          identifiers[i].profileId === profileId
        ) {
          identifiers.splice(i, 1);
          deletedIdentifiers++;
        }
      }
      for (let i = consents.length - 1; i >= 0; i--) {
        if (
          consents[i].tenantId === tenantId &&
          consents[i].profileId === profileId
        ) {
          consents.splice(i, 1);
          deletedConsents++;
        }
      }
      const key = profileKey(tenantId, profileId);
      if (profiles.delete(key)) deletedProfile = 1;

      return {
        facts: deletedFacts,
        identifiers: deletedIdentifiers,
        consents: deletedConsents,
        profile: deletedProfile,
      };
    },

    async appendAuditLog(entry) {
      auditLogCalls.push(entry);
    },

    touchLastSeenCalls,
    auditLogCalls,

    reset() {
      profiles.clear();
      identifiers.length = 0;
      consents.length = 0;
      facts.length = 0;
      touchLastSeenCalls.length = 0;
      auditLogCalls.length = 0;
    },

    // Inspection helpers
    getAllProfiles() {
      return Array.from(profiles.values());
    },
    getAllIdentifiers() {
      return [...identifiers];
    },
    getAllConsents() {
      return [...consents];
    },
    getAllFacts() {
      return [...facts];
    },
  };
}
