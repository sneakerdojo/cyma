/**
 * Drizzle-backed implementation of ProfileRepo.
 *
 * This is the production wiring. Unit tests use `_fake-repo.ts` instead;
 * integration coverage for this file lives in nightly DB tests (TODO when
 * pg test container fixture lands).
 *
 * Tenant scoping: every query filters by `tenantId`. Callers must pass the
 * resolved tenant id — this layer never infers it.
 */

import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db as defaultDb } from '../../db/client.js';
import {
  profileAuditLog,
  profileConsent,
  profileFacts,
  profileIdentifiers,
  profiles,
} from '../../db/schema.js';
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

type DrizzleDb = typeof defaultDb;

/**
 * Construct a Drizzle-backed ProfileRepo.
 * Caller may inject a custom db instance (transactions, tests) but default
 * is the singleton from db/client.
 */
export function createDrizzleProfileRepo(db: DrizzleDb = defaultDb): ProfileRepo {
  return {
    // ── Read ─────────────────────────────────────────────────────────────
    async findProfileIdsByIdentifierHashes(tenantId, hashes) {
      if (hashes.length === 0) return [];
      const rows = await db
        .select({ profileId: profileIdentifiers.profileId })
        .from(profileIdentifiers)
        .where(
          and(
            eq(profileIdentifiers.tenantId, tenantId),
            // (kind, valueHash) tuples — Drizzle has no native row-tuple-in
            // so build an OR list. Practically <= 4 entries; fine inline.
            sql`(${profileIdentifiers.kind}, ${profileIdentifiers.valueHash}) IN (${sql.join(
              hashes.map((h) => sql`(${h.kind}, ${h.valueHash})`),
              sql`, `,
            )})`,
            isNull(profileIdentifiers.supersededAt),
          ),
        );
      const ids = new Set<string>();
      for (const r of rows) ids.add(r.profileId);
      return Array.from(ids);
    },

    async getProfile(tenantId, profileId): Promise<ProfileRow | null> {
      const rows = await db
        .select()
        .from(profiles)
        .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, profileId)))
        .limit(1);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        tenantId: r.tenantId,
        displayName: r.displayName,
        summary: r.summary,
        preferredChannel: castChannel(r.preferredChannel),
        lastSeenAt: r.lastSeenAt ?? new Date(),
      };
    },

    async getLatestConsent(
      tenantId,
      profileId,
    ): Promise<ProfileConsentRow | null> {
      const rows = await db
        .select()
        .from(profileConsent)
        .where(
          and(
            eq(profileConsent.tenantId, tenantId),
            eq(profileConsent.profileId, profileId),
          ),
        )
        .orderBy(desc(profileConsent.grantedAt))
        .limit(1);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        profileId: r.profileId,
        tenantId: r.tenantId,
        granted: r.granted,
        channel: r.channel as 'chat' | 'voice',
        consentTextHash: r.consentTextHash,
        grantedAt: r.grantedAt ?? new Date(),
        revokedAt: r.revokedAt,
      };
    },

    async listFacts(tenantId, profileId): Promise<ProfileFactRow[]> {
      const rows = await db
        .select()
        .from(profileFacts)
        .where(
          and(
            eq(profileFacts.tenantId, tenantId),
            eq(profileFacts.profileId, profileId),
          ),
        );
      return rows.map(mapFactRow);
    },

    async exportProfile(tenantId, profileId): Promise<ProfileExportPayload> {
      const [profileRow, idents, factRows, consentRows] = await Promise.all([
        db
          .select()
          .from(profiles)
          .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, profileId)))
          .limit(1),
        db
          .select()
          .from(profileIdentifiers)
          .where(
            and(
              eq(profileIdentifiers.tenantId, tenantId),
              eq(profileIdentifiers.profileId, profileId),
            ),
          ),
        db
          .select()
          .from(profileFacts)
          .where(
            and(
              eq(profileFacts.tenantId, tenantId),
              eq(profileFacts.profileId, profileId),
            ),
          ),
        db
          .select()
          .from(profileConsent)
          .where(
            and(
              eq(profileConsent.tenantId, tenantId),
              eq(profileConsent.profileId, profileId),
            ),
          ),
      ]);

      const profile = profileRow.length === 0 ? null : ({
        id: profileRow[0].id,
        tenantId: profileRow[0].tenantId,
        displayName: profileRow[0].displayName,
        summary: profileRow[0].summary,
        preferredChannel: castChannel(profileRow[0].preferredChannel),
        lastSeenAt: profileRow[0].lastSeenAt ?? new Date(),
      } satisfies ProfileRow);

      return {
        profile,
        identifiers: idents.map((r) => ({
          profileId: r.profileId,
          tenantId: r.tenantId,
          kind: r.kind as ProfileIdentifierRow['kind'],
          valueHash: r.valueHash,
        })),
        facts: factRows.map(mapFactRow),
        consents: consentRows.map((r) => ({
          profileId: r.profileId,
          tenantId: r.tenantId,
          granted: r.granted,
          channel: r.channel as 'chat' | 'voice',
          consentTextHash: r.consentTextHash,
          grantedAt: r.grantedAt ?? new Date(),
          revokedAt: r.revokedAt,
        })),
      };
    },

    // ── Write ────────────────────────────────────────────────────────────
    async createProfile(input: CreateProfileInput) {
      const rows = await db
        .insert(profiles)
        .values({
          tenantId: input.tenantId,
          displayName: input.displayName,
          summary: input.summary,
          preferredChannel: input.preferredChannel ?? null,
          identityConfidence:
            input.identityConfidence !== undefined
              ? String(input.identityConfidence)
              : undefined,
        })
        .returning({ id: profiles.id });
      return rows[0].id;
    },

    async addIdentifier(input: AddIdentifierInput) {
      await db.insert(profileIdentifiers).values({
        tenantId: input.tenantId,
        profileId: input.profileId,
        kind: input.kind,
        valueHash: input.valueHash,
        value: input.value,
      });
    },

    async markIdentifierSuperseded(tenantId, profileId, kind, valueHash) {
      await db
        .update(profileIdentifiers)
        .set({ supersededAt: new Date() })
        .where(
          and(
            eq(profileIdentifiers.tenantId, tenantId),
            eq(profileIdentifiers.profileId, profileId),
            eq(profileIdentifiers.kind, kind),
            eq(profileIdentifiers.valueHash, valueHash),
          ),
        );
    },

    async touchLastSeen(tenantId, profileId) {
      await db
        .update(profiles)
        .set({ lastSeenAt: new Date() })
        .where(
          and(eq(profiles.tenantId, tenantId), eq(profiles.id, profileId)),
        );
    },

    async writeConsent(input: WriteConsentInput) {
      // Revoke any prior open consent first (revokedAt IS NULL).
      await db
        .update(profileConsent)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(profileConsent.tenantId, input.tenantId),
            eq(profileConsent.profileId, input.profileId),
            isNull(profileConsent.revokedAt),
          ),
        );
      await db.insert(profileConsent).values({
        tenantId: input.tenantId,
        profileId: input.profileId,
        granted: input.granted,
        channel: input.channel,
        consentTextHash: input.consentTextHash,
        transcriptSnippet: input.transcriptSnippet,
        ipOrCallerIdHash: input.ipOrCallerIdHash,
      });
    },

    async insertFact(input: InsertFactInput) {
      await db.insert(profileFacts).values({
        tenantId: input.tenantId,
        profileId: input.profileId,
        category: input.category,
        key: input.key,
        value: input.value,
        source: input.source,
        confidence:
          input.confidence !== undefined ? String(input.confidence) : undefined,
        expiresAt: input.expiresAt,
      });
    },

    async countOffTopicFacts(tenantId, profileId) {
      const rows = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(profileFacts)
        .where(
          and(
            eq(profileFacts.tenantId, tenantId),
            eq(profileFacts.profileId, profileId),
            eq(profileFacts.category, 'off_topic'),
          ),
        );
      return Number(rows[0]?.c ?? 0);
    },

    async evictOldestOffTopic(tenantId, profileId, n) {
      if (n <= 0) return;
      // Select oldest N ids, then delete by those ids — keeps it portable.
      const oldest = await db
        .select({ id: profileFacts.id })
        .from(profileFacts)
        .where(
          and(
            eq(profileFacts.tenantId, tenantId),
            eq(profileFacts.profileId, profileId),
            eq(profileFacts.category, 'off_topic'),
          ),
        )
        .orderBy(asc(profileFacts.createdAt))
        .limit(n);
      if (oldest.length === 0) return;
      const ids = oldest.map((r) => r.id);
      await db.delete(profileFacts).where(inArray(profileFacts.id, ids));
    },

    async deleteAllProfileData(tenantId, profileId): Promise<ForgetCounts> {
      // Order matters: facts → identifiers → consent → profile.
      // (Drizzle in our schema uses ON DELETE CASCADE for profile_id → so
      //  deleting the root would cascade — but explicit count returns are
      //  more useful for the audit log.)
      const factsDeleted = await db
        .delete(profileFacts)
        .where(
          and(
            eq(profileFacts.tenantId, tenantId),
            eq(profileFacts.profileId, profileId),
          ),
        )
        .returning({ id: profileFacts.id });
      const identsDeleted = await db
        .delete(profileIdentifiers)
        .where(
          and(
            eq(profileIdentifiers.tenantId, tenantId),
            eq(profileIdentifiers.profileId, profileId),
          ),
        )
        .returning({ id: profileIdentifiers.id });
      const consentsDeleted = await db
        .delete(profileConsent)
        .where(
          and(
            eq(profileConsent.tenantId, tenantId),
            eq(profileConsent.profileId, profileId),
          ),
        )
        .returning({ id: profileConsent.id });
      const profileDeleted = await db
        .delete(profiles)
        .where(and(eq(profiles.tenantId, tenantId), eq(profiles.id, profileId)))
        .returning({ id: profiles.id });

      return {
        facts: factsDeleted.length,
        identifiers: identsDeleted.length,
        consents: consentsDeleted.length,
        profile: profileDeleted.length,
      };
    },

    // ── Audit ────────────────────────────────────────────────────────────
    async appendAuditLog(entry: AuditLogInput) {
      await db.insert(profileAuditLog).values({
        tenantId: entry.tenantId,
        actor: entry.actor,
        action: entry.action,
        targetProfileId: entry.targetProfileId ?? null,
        targetHash: entry.targetHash ?? null,
        metadata: entry.metadata,
      });
    },
  };
}

// ── helpers ──────────────────────────────────────────────────────────────

function mapFactRow(r: typeof profileFacts.$inferSelect): ProfileFactRow {
  return {
    id: r.id,
    profileId: r.profileId,
    tenantId: r.tenantId,
    category: r.category as ProfileFactRow['category'],
    key: r.key,
    value: r.value,
    source: r.source as ProfileFactRow['source'],
    confidence: r.confidence,
    createdAt: r.createdAt ?? new Date(),
    expiresAt: r.expiresAt,
  };
}

function castChannel(c: string | null): ProfileRow['preferredChannel'] {
  if (c === 'chat' || c === 'voice' || c === 'whatsapp' || c === 'email') return c;
  return null;
}
