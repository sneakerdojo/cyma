/**
 * Google OAuth HTTP endpoints.
 *
 * Used for any flow where a user grants Google access via the browser
 * and we need to capture the resulting refresh token. Today this is
 * Octio's own setup (single tenant); tomorrow it's customer onboarding
 * (multi-tenant).
 *
 *   GET /oauth/google/start
 *     Optional query: tenant=<id>, returnTo=<path>
 *     Builds the consent URL with all Octio scopes and 302-redirects.
 *
 *   GET /oauth/google/callback
 *     Receives Google's redirect (?code=...&state=...).
 *     Exchanges the code for tokens, hands off to a tenant-specific
 *     storage strategy, and 302-redirects to returnTo.
 *
 * For Octio's own setup (`tenant=octio`):
 *   - Tokens are written to worker/.env
 *   - You must restart the worker afterwards to pick them up
 *
 * For real customer tenants (post multi-tenancy):
 *   - Tokens go into the tenants table keyed by tenant id
 *   - No worker restart needed; the next API call uses the new token
 *
 * SOLID notes:
 *   - Single responsibility: HTTP plumbing + state validation only.
 *     The OAuth handshake itself lives in services/google-oauth-flow.ts
 *     so any future caller (CLI, HTTP, programmatic) gets the same scopes.
 *   - Open/closed: add new tenants by adding a new branch in the
 *     storage strategy switch — endpoint code stays the same.
 */

import { Hono } from 'hono';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { logger } from '../logger.js';
import {
  buildAuthUrl,
  exchangeCodeForRefreshToken,
  verifyTokenScopes,
  type OAuthTokens,
} from '../services/google-oauth-flow.js';

// ---------------------------------------------------------------------------
// Redirect URI is environment-specific. Add the matching values to
// the OAuth client in Google Cloud Console under "Authorized redirect URIs":
//
//   Local dev:  http://localhost:3007/oauth/google/callback
//   Prod:       https://api.octio.co.za/oauth/google/callback
// ---------------------------------------------------------------------------

function getRedirectUri(): string {
  const base = config.apiBaseUrl.replace(/\/+$/, '');
  return `${base}/oauth/google/callback`;
}

// ---------------------------------------------------------------------------
// State store — protects against CSRF + carries tenant context across the
// hop to Google and back. In-memory is fine for now; swap for Redis or a
// signed JWT when running multi-instance.
// ---------------------------------------------------------------------------

interface PendingState {
  tenant: string;
  returnTo: string;
  createdAt: number;
}

const stateStore = new Map<string, PendingState>();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function rememberState(state: PendingState): string {
  const id = randomUUID();
  stateStore.set(id, state);
  // Lazy GC of expired states
  for (const [key, value] of stateStore.entries()) {
    if (Date.now() - value.createdAt > STATE_TTL_MS) stateStore.delete(key);
  }
  return id;
}

function consumeState(id: string): PendingState | null {
  const state = stateStore.get(id);
  if (!state) return null;
  stateStore.delete(id);
  if (Date.now() - state.createdAt > STATE_TTL_MS) return null;
  return state;
}

// ---------------------------------------------------------------------------
// Storage strategy — where do tokens go after exchange?
// Single switch point so adding tenant types doesn't change endpoint code.
// ---------------------------------------------------------------------------

async function storeTokensForTenant(
  tenant: string,
  tokens: OAuthTokens,
): Promise<{ ok: boolean; message: string }> {
  if (tenant === 'octio') {
    return writeOctioRefreshTokenToEnv(tokens.refreshToken);
  }

  // Future: lookup tenants table by id, update googleRefreshToken column
  // await db.update(tenants).set({ googleRefreshToken: tokens.refreshToken })
  //   .where(eq(tenants.id, tenant));
  logger.warn(
    { tenant },
    'OAuth callback succeeded but no storage strategy registered for this tenant — token discarded',
  );
  return {
    ok: false,
    message: `No storage strategy registered for tenant "${tenant}". Token was not saved.`,
  };
}

function writeOctioRefreshTokenToEnv(
  refreshToken: string,
): { ok: boolean; message: string } {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = resolve(__dirname, '..', '..', '.env');

  try {
    const current = readFileSync(envPath, 'utf-8');
    const lines = current.split('\n');
    const idx = lines.findIndex((l) =>
      l.startsWith('GOOGLE_REFRESH_TOKEN='),
    );
    const newLine = `GOOGLE_REFRESH_TOKEN=${refreshToken}`;
    if (idx >= 0) {
      lines[idx] = newLine;
    } else {
      lines.push(newLine);
    }
    writeFileSync(envPath, lines.join('\n'));
    logger.info(
      { envPath },
      'Wrote new GOOGLE_REFRESH_TOKEN to .env (restart worker to load)',
    );
    return {
      ok: true,
      message:
        'Token written to worker/.env. Restart the worker to load it: pnpm --filter @octio/worker run dev',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'Failed to write refresh token to .env');
    return { ok: false, message: `Failed to write to .env: ${msg}` };
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const oauthRoutes = new Hono();

oauthRoutes.get('/google/start', (c) => {
  if (!config.googleClientId || !config.googleClientSecret) {
    return c.json(
      { error: 'GOOGLE_CLIENT_ID / SECRET not configured on server' },
      500,
    );
  }

  const tenant = c.req.query('tenant') || 'octio';
  const returnTo = c.req.query('returnTo') || '/';

  const state = rememberState({ tenant, returnTo, createdAt: Date.now() });

  const authUrl = buildAuthUrl({
    clientId: config.googleClientId,
    clientSecret: config.googleClientSecret,
    redirectUri: getRedirectUri(),
    state,
  });

  logger.info({ tenant, returnTo }, 'Redirecting to Google consent');
  return c.redirect(authUrl, 302);
});

oauthRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const errorParam = c.req.query('error');

  if (errorParam) {
    logger.warn({ error: errorParam }, 'Google returned an OAuth error');
    return c.html(
      renderResultPage({
        ok: false,
        title: 'Google denied the consent',
        body: `Google returned: <code>${escapeHtml(errorParam)}</code>. Most often this means you (or the user) clicked "Cancel" on the consent screen, or your account is not added as a test user.`,
      }),
      400,
    );
  }

  if (!code || !state) {
    return c.html(
      renderResultPage({
        ok: false,
        title: 'Missing code or state',
        body: 'The callback URL is missing required parameters. Restart the OAuth flow.',
      }),
      400,
    );
  }

  const remembered = consumeState(state);
  if (!remembered) {
    return c.html(
      renderResultPage({
        ok: false,
        title: 'Invalid or expired state',
        body: 'The OAuth state token is invalid or expired (10 min TTL). Restart the flow.',
      }),
      400,
    );
  }

  if (!config.googleClientId || !config.googleClientSecret) {
    return c.json(
      { error: 'GOOGLE_CLIENT_ID / SECRET not configured on server' },
      500,
    );
  }

  try {
    const tokens = await exchangeCodeForRefreshToken({
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      redirectUri: getRedirectUri(),
      code,
    });

    const verification = await verifyTokenScopes(
      {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
        redirectUri: getRedirectUri(),
      },
      tokens.refreshToken,
    );

    const storage = await storeTokensForTenant(remembered.tenant, tokens);

    return c.html(
      renderResultPage({
        ok: storage.ok && verification.ok,
        title: storage.ok && verification.ok
          ? 'Google connected successfully'
          : 'Google connected with warnings',
        body: `<p>${escapeHtml(storage.message)}</p>
          <p>Granted scopes:</p>
          <ul>${tokens.grantedScopes.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
          ${verification.missing.length > 0
            ? `<p style="color:#dc2626;">Missing scopes: ${verification.missing.map((s) => escapeHtml(s)).join(', ')}. The user may need to re-run consent.</p>`
            : ''
          }
          <p style="margin-top:24px;"><a href="${escapeHtml(remembered.returnTo)}" style="color:#E8862A;font-weight:600;">Continue →</a></p>`,
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, tenant: remembered.tenant }, 'OAuth code exchange failed');
    return c.html(
      renderResultPage({
        ok: false,
        title: 'Token exchange failed',
        body: `<pre>${escapeHtml(msg)}</pre>`,
      }),
      500,
    );
  }
});

export { oauthRoutes };

// ---------------------------------------------------------------------------
// Tiny HTML helpers — keeps the result page self-contained
// ---------------------------------------------------------------------------

function renderResultPage(opts: {
  ok: boolean;
  title: string;
  body: string;
}): string {
  const colour = opts.ok ? '#16a34a' : '#dc2626';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(opts.title)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 80px auto; padding: 0 24px; color: #111; line-height: 1.5; }
  h1 { color: ${colour}; margin-bottom: 16px; }
  ul { background: #f3f4f6; padding: 16px 16px 16px 32px; border-radius: 6px; }
  pre { background: #fef2f2; border-radius: 6px; padding: 16px; color: #991b1b; overflow-x: auto; }
  code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
</style></head>
<body><h1>${escapeHtml(opts.title)}</h1>${opts.body}</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
