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

export interface ProfileRepo {
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

  /** Mark a profile's last_seen_at = now(). Idempotent. */
  touchLastSeen(tenantId: number, profileId: string): Promise<void>;

  /** Append-only audit log write. */
  appendAuditLog(entry: AuditLogInput): Promise<void>;
}
