import { google } from 'googleapis';
import { config } from '../config.js';

// ---------------------------------------------------------------------------
// OAuth2 client factory — cached singleton per process
// ---------------------------------------------------------------------------

let cachedClient: InstanceType<typeof google.auth.OAuth2> | null = null;

/**
 * Returns a cached OAuth2 client pre-loaded with the refresh token from config.
 *
 * Fails fast if any of the three required Google credentials are absent so that
 * misconfigured deployments surface early rather than during the first request.
 *
 * To obtain a refresh token for the first time, run:
 *   pnpm --filter @octio/worker run get-refresh-token
 */
export function getOAuth2Client(): InstanceType<typeof google.auth.OAuth2> {
  if (cachedClient) return cachedClient;

  if (
    !config.googleClientId ||
    !config.googleClientSecret ||
    !config.googleRefreshToken
  ) {
    throw new Error(
      'Google OAuth credentials not configured. Run: pnpm --filter @octio/worker run get-refresh-token',
    );
  }

  const client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
  );

  client.setCredentials({ refresh_token: config.googleRefreshToken });

  cachedClient = client;
  return client;
}

/**
 * Reset the cached client — used in tests or when credentials are rotated.
 */
export function resetOAuth2ClientCache(): void {
  cachedClient = null;
}
