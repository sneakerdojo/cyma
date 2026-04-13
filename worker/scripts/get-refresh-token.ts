/**
 * get-refresh-token.ts
 *
 * ONE-TIME script. Run this once to capture a Google OAuth refresh token.
 * The token is printed to the terminal — copy it to worker/.env.
 *
 * Usage:
 *   pnpm --filter @octio/worker run get-refresh-token
 *
 * Prerequisites:
 *   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in worker/.env
 *   - The redirect URI http://localhost:3005/oauth2callback must be registered
 *     in your Google Cloud Console OAuth 2.0 credentials.
 *
 * See worker/README.md for the full setup walkthrough.
 */

import http from 'node:http';
import { google } from 'googleapis';
import open from 'open';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OAUTH_PORT = 3005;
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/oauth2callback`;
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/meetings.space.readonly',
];

// ---------------------------------------------------------------------------
// Env validation — fail fast with a clear message
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
// OAuth2 client setup
// ---------------------------------------------------------------------------

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

// ---------------------------------------------------------------------------
// HTML helpers — rendered inside the temporary browser tab
// ---------------------------------------------------------------------------

function buildSuccessPage(token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>OAuth success</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 80px auto; padding: 0 24px; color: #111; }
  h1 { color: #16a34a; }
  pre { background: #f3f4f6; border-radius: 6px; padding: 16px; overflow-x: auto; word-break: break-all; white-space: pre-wrap; }
  p.note { color: #6b7280; font-size: 0.875rem; }
</style>
</head>
<body>
  <h1>OAuth flow complete</h1>
  <p>Your refresh token has been printed in the terminal. You can close this tab.</p>
  <p class="note">Do not share this token. Add it to <code>worker/.env</code> as <code>GOOGLE_REFRESH_TOKEN</code>.</p>
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
// Main — spin up temporary HTTP server and open the browser
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${OAUTH_PORT}`);

    if (url.pathname !== '/oauth2callback') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    // Google sends an error param when the user denies consent.
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

    // Exchange the authorization code for tokens.
    try {
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        console.error(
          '\nGoogle did not return a refresh_token.\n' +
            'This usually means a refresh token already exists for this client + user.\n' +
            'Revoke access at https://myaccount.google.com/permissions and run the script again.\n',
        );
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          buildErrorPage(
            'No refresh_token in response. Revoke access at https://myaccount.google.com/permissions and re-run.',
          ),
        );
        cleanup(server, timeoutHandle, 1);
        return;
      }

      // Print the refresh token clearly — this is the only place it appears.
      const border = '═'.repeat(61);
      console.log(`\n${border}`);
      console.log('SUCCESS - Google OAuth refresh token captured');
      console.log(border);
      console.log('Add this to worker/.env:\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log(`\nThen restart the worker: pnpm --filter @octio/worker run dev`);
      console.log(`${border}\n`);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buildSuccessPage(tokens.refresh_token));
      cleanup(server, timeoutHandle, 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nFailed to exchange authorization code for tokens: ${message}\n`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buildErrorPage(`Token exchange failed: ${message}`));
      cleanup(server, timeoutHandle, 1);
    }
  });

  // 5-minute hard timeout — avoid leaving a dangling server.
  timeoutHandle = setTimeout(() => {
    console.error(
      '\nTimeout: no OAuth callback received within 5 minutes.\n' +
        'The temporary server has been shut down. Re-run the script to try again.\n',
    );
    cleanup(server, null, 1);
  }, TIMEOUT_MS);

  // Clean SIGINT — user pressed Ctrl+C.
  process.on('SIGINT', () => {
    console.log('\nInterrupted. Closing temporary server.\n');
    cleanup(server, timeoutHandle, 0);
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(OAUTH_PORT, () => {
      console.log(`\nTemporary OAuth callback server listening on port ${OAUTH_PORT}`);
      resolve();
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `\nPort ${OAUTH_PORT} is already in use.\n` +
            `Find and stop the process using that port, or edit OAUTH_PORT in the script\n` +
            `(and update the redirect URI in Google Cloud Console to match).\n`,
        );
      } else {
        console.error(`\nServer error: ${err.message}\n`);
      }
      reject(err);
    });
  });

  // Print the URL as a fallback for environments that cannot auto-open a browser.
  console.log('\nOpening your browser to complete the OAuth flow...');
  console.log('If the browser does not open, navigate to this URL manually:\n');
  console.log(authUrl);
  console.log('\nWaiting for the OAuth callback (timeout: 5 minutes)...\n');

  await open(authUrl);
}

// ---------------------------------------------------------------------------
// Cleanup helper — close server and exit with the given code
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
// Entry point
// ---------------------------------------------------------------------------

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nFatal error: ${message}\n`);
  process.exit(1);
});
