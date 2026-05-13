/**
 * Profile service public entry-point.
 *
 * Spec: docs/superpowers/specs/2026-05-13-profile-system.md
 *
 * The single shared service that Lead Gen + Voice Agent both call to:
 *   - lookup     → recognise returning visitors / callers
 *   - consent    → record opt-in / opt-out decisions
 *   - extend     → write facts (with off_topic cap + sensitive block)
 *   - forget     → POPIA s.24 right-to-be-forgotten
 *   - export     → POPIA s.23 subject access request
 *
 * The repo abstraction (./repo.ts) keeps the service Drizzle-agnostic so
 * unit tests can swap in an in-memory fake.
 *
 * Identity matching is documented in ./identity.ts; phone is primary, with
 * email + name_hint as additional matchers (per spec).
 */

export { profileLookup } from './lookup.js';
export type {
  ProfileLookupArgs,
  ProfileLookupResult,
} from './lookup.js';

export { recordConsent } from './consent.js';
export type {
  RecordConsentArgs,
  RecordConsentResult,
} from './consent.js';

export { extendProfile, FACT_OFF_TOPIC_CAP } from './extend.js';
export type {
  ExtendProfileArgs,
  ExtendProfileResult,
} from './extend.js';

export { forgetProfile } from './forget.js';
export type {
  ForgetProfileArgs,
  ForgetProfileResult,
} from './forget.js';

export { exportProfileData } from './export.js';
export type {
  ExportProfileArgs,
  ExportProfileResult,
} from './export.js';

export {
  normaliseSAPhone,
  hashIdentifier,
  scoreIdentityConfidence,
} from './identity.js';
export type { Identity, IdentifierKind } from './identity.js';

// Production repo factory (Drizzle-backed). Lead Gen + Voice Agent should
// import this and pass the resulting repo into the service functions.
export { createDrizzleProfileRepo } from './repo.drizzle.js';

export type {
  ProfileRepo,
  ProfileRow,
  ProfileIdentifierRow,
  ProfileConsentRow,
  ProfileFactRow,
  ProfileExportPayload,
  ForgetCounts,
  CreateProfileInput,
  AddIdentifierInput,
  WriteConsentInput,
  InsertFactInput,
  AuditLogInput,
} from './repo.js';
