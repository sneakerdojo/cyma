/**
 * get-refresh-token.ts
 *
 * Captures a Google OAuth refresh token for Octio's own setup.
 *
 * Sequence:
 *   1. Spin up a temporary HTTP server on the registered redirect port (3005)
 *   2. Build the OAuth URL using shared primitives
 *   3. Open the user's browser (or print the URL for manual paste)
 *   4. Catch the callback, exchange the code for tokens
 *   5. Print the refresh token to copy into worker/.env
 *
 * For multi-tenant customer onboarding, do NOT use this script — use the
 * HTTP endpoints in worker/src/routes/oauth.ts instead. Both paths share
 * the same primitives in worker/src/services/google-oauth-flow.ts so
 * scope changes propagate to both flows automatically.
 *
 * Usage:
 *   pnpm --filter @octio/worker run get-refresh-token
 */

import http from 'node:http';
import open from 'open';
import {
  buildAuthUrl,
  exchangeCodeForRefreshToken,
  verifyTokenScopes,
  OCTIO_GOOGLE_SCOPES,
} from '../src/services/google-oauth-flow.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OAUTH_PORT = 3005;
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/oauth2callback`;
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Env validation
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.error(
      `\nError: ${name} is not set.\n` +
        `Add it to worker/.env and re-run:\n` +
        `  pnpm --filter @octio/worker run get-refresh-token\n`,
    );
    process.exit(1);
  }
  return value.trim();
}

const clientId = requireEnv('GOOGLE_CLIENT_ID');
const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');

// ---------------------------------------------------------------------------
// HTML helpers — rendered inside the temporary browser tab
// ---------------------------------------------------------------------------

function buildSuccessPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>OAuth success</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 80px auto; padding: 0 24px; color: #111; }
  h1 { color: #16a34a; }
</style>
</head>
<body>
  <h1>OAuth flow complete</h1>
  <p>Your refresh token has been printed in the terminal. You can close this tab.</p>
  <p style="color:#6b7280;font-size:0.875rem;">Add the printed token to <code>worker/.env</code> as <code>GOOGLE_REFRESH_TOKEN</code>.</p>
</body>
</html>`;
}

function buildErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>OAuth error</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 80px auto; padding: 0 24px; color: #111; }
  h1 { color: #dc2626; }
  pre { background: #fef2f2; border-radius: 6px; padding: 16px; color: #991b1b; }
</style>
</head>
<body>
  <h1>OAuth flow failed</h1>
  <pre>${message}</pre>
  <p>Check the terminal for more details, then re-run the script.</p>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Cleanup helper
// ---------------------------------------------------------------------------

function cleanup(
  server: http.Server,
  timeoutHandle: ReturnType<typeof setTimeout> | null,
  exitCode: number,
): void {
  if (timeoutHandle !== null) {
    clearTimeout(timeoutHandle);
  }
  server.close(() => {
    process.exit(exitCode);
  });
}

// ---------------------------------------------------------------------------
// Main — temporary HTTP server + browser open
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const authUrl = buildAuthUrl({
    clientId,
    clientSecret,
    redirectUri: REDIRECT_URI,
  });

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${OAUTH_PORT}`);

    if (url.pathname !== '/oauth2callback') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const googleError = url.searchParams.get('error');
    if (googleError) {
      console.error(`\nGoogle returned an error: ${googleError}`);
      console.error(
        'If this is "access_denied", make sure your email is added as a test user in the OAuth consent screen.\n',
      );
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buildErrorPage(`Google error: ${googleError}`));
      cleanup(server, timeoutHandle, 1);
      return;
    }

    const code = url.searchParams.get('code');
    if (!code) {
      console.error('\nNo authorization code received in the callback URL.\n');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buildErrorPage('No authorization code found in callback URL.'));
      cleanup(server, timeoutHandle, 1);
      return;
    }

    try {
      const tokens = await exchangeCodeForRefreshToken({
        clientId,
        clientSecret,
        redirectUri: REDIRECT_URI,
        code,
      });

      // Verify scopes — we want every Octio scope to be present
      const verification = await verifyTokenScopes(
        { clientId, clientSecret, redirectUri: REDIRECT_URI },
        tokens.refreshToken,
      );

      const border = '═'.repeat(72);
      console.log(`\n${border}`);
      console.log('SUCCESS — Google OAuth refresh token captured');
      console.log(border);

      console.log('\nGranted scopes:');
      for (const s of tokens.grantedScopes) console.log(`  ✓ ${s}`);

      if (verification.missing.length > 0) {
        console.log('\nMissing scopes (will need to re-run):');
        for (const s of verification.missing) console.log(`  ✗ ${s}`);
      } else {
        console.log('\nAll Octio scopes present — token is ready for production use.');
      }

      console.log('\nAdd this to worker/.env:\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refreshToken}`);
      console.log(`\nThen restart the worker: pnpm --filter @octio/worker run dev`);
      console.log(`${border}\n`);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buildSuccessPage());
      cleanup(server, timeoutHandle, 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nFailed to exchange authorization code for tokens: ${message}\n`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buildErrorPage(`Token exchange failed: ${message}`));
      cleanup(server, timeoutHandle, 1);
    }
  });

  timeoutHandle = setTimeout(() => {
    console.error(
      '\nTimeout: no OAuth callback received within 5 minutes.\n' +
        'The temporary server has been shut down. Re-run the script to try again.\n',
    );
    cleanup(server, null, 1);
  }, TIMEOUT_MS);

  process.on('SIGINT', () => {
    console.log('\nInterrupted. Closing temporary server.\n');
    cleanup(server, timeoutHandle, 0);
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(OAUTH_PORT, () => {
      console.log(`\nTemporary OAuth callback server listening on port ${OAUTH_PORT}`);
      console.log(`Requesting ${OCTIO_GOOGLE_SCOPES.length} scopes:`);
      for (const s of OCTIO_GOOGLE_SCOPES) console.log(`  • ${s}`);
      resolve();
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `\nPort ${OAUTH_PORT} is already in use.\n` +
            `Find and stop the process using that port (commonly the Workspace MCP).\n`,
        );
      } else {
        console.error(`\nServer error: ${err.message}\n`);
      }
      reject(err);
    });
  });

  console.log('\nOpening your browser to complete the OAuth flow...');
  console.log('If the browser does not open, navigate to this URL manually:\n');
  console.log(authUrl);
  console.log('\nWaiting for the OAuth callback (timeout: 5 minutes)...\n');

  await open(authUrl);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nFatal error: ${message}\n`);
  process.exit(1);
});
