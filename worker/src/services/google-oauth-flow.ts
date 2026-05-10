/**
 * Google OAuth flow primitives.
 *
 * Reusable building blocks for any place we need to capture a Google
 * refresh token with the full set of Octio scopes:
 *
 *   - The CLI (`scripts/get-refresh-token.ts`) — Octio's own setup
 *   - A future customer-onboarding HTTP endpoint — same primitives,
 *     different redirect URI, different token storage destination
 *
 * Designed so that adding a new caller is just three function calls:
 *   1. `buildAuthUrl(...)` — get the URL to send the user to
 *   2. (user signs in + grants consent in their browser)
 *   3. `exchangeCodeForRefreshToken(code, ...)` — turn the callback code
 *      into a refresh token bound to all scopes
 *   4. `verifyTokenScopes(...)` — confirm the token actually got the
 *      scopes we asked for (Google occasionally drops scopes silently)
 *
 * This module is intentionally storage-agnostic — it returns the tokens.
 * The caller decides where to put them (worker/.env for Octio, tenant
 * row in DB for a customer, environment-specific secret store for prod).
 *
 * SOLID notes:
 *   - Single responsibility: only the OAuth handshake. No HTTP server,
 *     no CLI, no env-file munging — those live in callers.
 *   - Open/closed: add new scopes to OCTIO_SCOPES; every caller picks
 *     them up automatically.
 */

import { google } from 'googleapis';

// ---------------------------------------------------------------------------
// The complete scope set Octio needs
// ---------------------------------------------------------------------------

/**
 * IMPORTANT: this list is the source of truth. Changing it changes the
 * OAuth consent screen for every caller — CLI, HTTP endpoint, and any
 * future flow. To add a new Google product (e.g. Drive, Sheets) push
 * its scope into this array and re-run the OAuth flow once; existing
 * callers pick it up automatically because they all read this constant.
 *
 * Calendar — full access required for freebusy.query AND calendar
 * provisioning (calendars.insert / acl.insert). The narrower
 * `calendar.events` scope cannot create calendars.
 */
export const OCTIO_GOOGLE_SCOPES: readonly string[] = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/admin.directory.group',
  'https://www.googleapis.com/auth/admin.directory.group.member',
  'https://www.googleapis.com/auth/contacts',
] as const;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface OAuthClientCreds {
  clientId: string;
  clientSecret: string;
  /**
   * Where Google should redirect the user after they consent.
   *
   * Must EXACTLY match a redirect URI registered in Google Cloud Console
   * for this OAuth client. For Octio we register both:
   *   - http://localhost:3005/oauth2callback (CLI flow, dev only)
   *   - https://api.octio.co.za/oauth/google/callback (HTTP flow, prod)
   *   - http://localhost:3007/oauth/google/callback (HTTP flow, dev)
   *
   * For multi-tenant later: the production redirect URI stays the same
   * regardless of tenant — we use a `state` parameter to identify which
   * tenant the callback belongs to.
   */
  redirectUri: string;
}

export interface BuildAuthUrlOptions extends OAuthClientCreds {
  /**
   * Opaque value round-tripped through Google. The HTTP-flow caller
   * uses this to identify which tenant initiated the consent. Recommended:
   * a random UUID looked up in a server-side state store, or a signed
   * JWT carrying { tenantId, returnTo } claims.
   */
  state?: string;
  /**
   * Defaults to true. When the caller has already authorised some scopes
   * and is adding new ones, setting this preserves the prior grants.
   */
  includeGrantedScopes?: boolean;
}

export interface OAuthTokens {
  refreshToken: string;
  accessToken: string;
  /** Unix ms when the access token expires */
  accessTokenExpiresAt: number;
  /** The actual scopes Google granted (may be subset of what was asked) */
  grantedScopes: string[];
}

// ---------------------------------------------------------------------------
// Build the consent URL
// ---------------------------------------------------------------------------

/**
 * Generate the URL to send the user to. They sign in, grant scopes,
 * and Google redirects them back to `redirectUri` with a `code` query
 * param to be exchanged for tokens via `exchangeCodeForRefreshToken`.
 */
export function buildAuthUrl(opts: BuildAuthUrlOptions): string {
  const oauth2Client = new google.auth.OAuth2(
    opts.clientId,
    opts.clientSecret,
    opts.redirectUri,
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: opts.includeGrantedScopes ?? true,
    scope: [...OCTIO_GOOGLE_SCOPES],
    state: opts.state,
  });
}

// ---------------------------------------------------------------------------
// Exchange the callback code for tokens
// ---------------------------------------------------------------------------

export interface ExchangeCodeOptions extends OAuthClientCreds {
  /** The `code` query parameter Google included in the redirect */
  code: string;
}

/**
 * Exchanges the authorization code for an access + refresh token pair.
 *
 * Throws if Google did not return a refresh_token. That happens when
 * the user has already authorised this OAuth client and Google decides
 * to reuse the prior grant — typically caused by NOT setting
 * `prompt=consent` on the auth URL. Our `buildAuthUrl` always sets it.
 *
 * If you still hit it, the user needs to revoke access at
 * https://myaccount.google.com/permissions and re-run the flow.
 */
export async function exchangeCodeForRefreshToken(
  opts: ExchangeCodeOptions,
): Promise<OAuthTokens> {
  const oauth2Client = new google.auth.OAuth2(
    opts.clientId,
    opts.clientSecret,
    opts.redirectUri,
  );

  const { tokens } = await oauth2Client.getToken(opts.code);

  if (!tokens.refresh_token) {
    throw new Error(
      'Google did not return a refresh_token. This usually means the user already authorised this client. Revoke access at https://myaccount.google.com/permissions and re-run the flow.',
    );
  }

  if (!tokens.access_token) {
    throw new Error('Google did not return an access_token');
  }

  // Google echoes back the scopes it actually granted. May be a subset
  // of what we asked for if the user manually toggled some off.
  const grantedScopes = (tokens.scope ?? '').split(' ').filter(Boolean);

  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    accessTokenExpiresAt: tokens.expiry_date ?? Date.now() + 3600 * 1000,
    grantedScopes,
  };
}

// ---------------------------------------------------------------------------
// Verify a refresh token has the scopes we expect
// ---------------------------------------------------------------------------

export interface VerifyScopesResult {
  ok: boolean;
  granted: string[];
  missing: string[];
}

/**
 * Cheap check — does this refresh token cover all the scopes Octio needs?
 *
 * Useful in two places:
 *   1. After a fresh OAuth flow to confirm the token Google issued has
 *      every scope (Google occasionally drops some)
 *   2. As a periodic health check in production (e.g. weekly cron)
 */
export async function verifyTokenScopes(
  creds: OAuthClientCreds,
  refreshToken: string,
): Promise<VerifyScopesResult> {
  const oauth2Client = new google.auth.OAuth2(
    creds.clientId,
    creds.clientSecret,
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Force a token refresh so we get the live grant info
  const { credentials } = await oauth2Client.refreshAccessToken();

  const granted = (credentials.scope ?? '').split(' ').filter(Boolean);
  const missing = OCTIO_GOOGLE_SCOPES.filter((s) => !granted.includes(s));

  return {
    ok: missing.length === 0,
    granted,
    missing,
  };
}
