/**
 * ProfileRepo — data-access boundary for the profile system.
 *
 * Why a repo: it lets lookup / extend / consent / forget / export
 * be tested with simple fakes instead of mocking Drizzle's chainable
 * builder. Concrete implementation in repo.drizzle.ts is wired to
 * the production db client.
 *
 * Identifier hashes (kind:value) are sha256 hex strings — see identity.ts.
 */

export interface ProfileRow {
  id: string;
  tenantId: number;
  displayName: string | null;
  summary: string | null;
  preferredChannel: 'chat' | 'voice' | 'whatsapp' | 'email' | null;
  lastSeenAt: Date;
}

export interface ProfileIdentifierRow {
  profileId: string;
  tenantId: number;
  kind: 'phone' | 'email' | 'whatsapp' | 'name_hint';
  valueHash: string;
}

export interface ProfileConsentRow {
  profileId: string;
  tenantId: number;
  granted: boolean;
  channel: 'chat' | 'voice';
  consentTextHash: string;
  grantedAt: Date;
  revokedAt: Date | null;
}

export interface AuditLogInput {
  tenantId: number;
  actor: string;
  action: 'lookup' | 'extend' | 'consent' | 'forget' | 'export' | 'auto_purge';
  targetProfileId?: string | null;
  targetHash?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProfileFactRow {
  id: string;
  profileId: string;
  tenantId: number;
  category:
    | 'preference'
    | 'history'
    | 'service_context'
    | 'personal'
    | 'off_topic'
    | 'sensitive';
  key: string;
  value: unknown;
  source: 'agent_inferred' | 'user_stated' | 'system_recorded';
  confidence: string;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface CreateProfileInput {
  tenantId: number;
  displayName?: string;
  summary?: string;
  preferredChannel?: ProfileRow['preferredChannel'];
  identityConfidence?: number;
}

export interface AddIdentifierInput {
  tenantId: number;
  profileId: string;
  kind: ProfileIdentifierRow['kind'];
  valueHash: string;
  value: string;
}

export interface WriteConsentInput {
  tenantId: number;
  profileId: string;
  granted: boolean;
  channel: 'chat' | 'voice';
  consentTextHash: string;
  transcriptSnippet?: string;
  ipOrCallerIdHash?: string;
}

export interface InsertFactInput {
  tenantId: number;
  profileId: string;
  category: ProfileFactRow['category'];
  key: string;
  value: unknown;
  source: ProfileFactRow['source'];
  confidence?: number;
  expiresAt?: Date;
}

export interface ForgetCounts {
  facts: number;
  identifiers: number;
  consents: number;
  profile: number;
}

export interface ProfileExportPayload {
  profile: ProfileRow | null;
  identifiers: ProfileIdentifierRow[];
  facts: ProfileFactRow[];
  consents: ProfileConsentRow[];
}

export interface ProfileRepo {
  // ── Read ────────────────────────────────────────────────────────────────
  /** Find profile_id(s) matching any of the given (tenantId, kind, value_hash) tuples. */
  findProfileIdsByIdentifierHashes(
    tenantId: number,
    hashes: Array<{ kind: ProfileIdentifierRow['kind']; valueHash: string }>,
  ): Promise<string[]>;

  /** Load a profile row by id, scoped by tenant. */
  getProfile(tenantId: number, profileId: string): Promise<ProfileRow | null>;

  /** Latest consent row for a profile, or null. */
  getLatestConsent(
    tenantId: number,
    profileId: string,
  ): Promise<ProfileConsentRow | null>;

  /** All non-superseded facts for a profile. */
  listFacts(tenantId: number, profileId: string): Promise<ProfileFactRow[]>;

  /** Full export payload — used by SAR (US-LG-044 / US-AT-024). */
  exportProfile(
    tenantId: number,
    profileId: string,
  ): Promise<ProfileExportPayload>;

  // ── Write ───────────────────────────────────────────────────────────────
  /** Create a new profile row. Returns the new profile_id. */
  createProfile(input: CreateProfileInput): Promise<string>;

  /** Attach an identifier to an existing profile. */
  addIdentifier(input: AddIdentifierInput): Promise<void>;

  /** Mark an identifier as superseded (sets superseded_at = now). */
  markIdentifierSuperseded(
    tenantId: number,
    profileId: string,
    kind: ProfileIdentifierRow['kind'],
    valueHash: string,
  ): Promise<void>;

  /** Mark a profile's last_seen_at = now(). Idempotent. */
  touchLastSeen(tenantId: number, profileId: string): Promise<void>;

  /**
   * Write a new consent row. If granted=true, supersedes any prior open
   * (revokedAt = null) consent for the same profile. If granted=false,
   * revokes any prior open consent and writes a denial row.
   */
  writeConsent(input: WriteConsentInput): Promise<void>;

  /** Insert a fact row. Caller is responsible for category + TTL choice. */
  insertFact(input: InsertFactInput): Promise<void>;

  /**
   * Count off_topic facts for a profile. Caller compares to cap (20) and
   * calls evictOldestOffTopic if over. Separated so the count decision
   * lives in the service layer, not the repo.
   */
  countOffTopicFacts(tenantId: number, profileId: string): Promise<number>;

  /** Evict the oldest N off_topic facts. */
  evictOldestOffTopic(
    tenantId: number,
    profileId: string,
    n: number,
  ): Promise<void>;

  /** Hard-delete everything for a profile. Used by US-LG-040 / US-VA-047. */
  deleteAllProfileData(
    tenantId: number,
    profileId: string,
  ): Promise<ForgetCounts>;

  // ── Audit ──────────────────────────────────────────────────────────────
  /** Append-only audit log write. */
  appendAuditLog(entry: AuditLogInput): Promise<void>;
}
