# Octio Worker

## Overview

The Octio Worker is the backend service powering the Octio AI wizard and freechat product.
It is built with Hono (HTTP), Drizzle ORM (Postgres), and integrates with Google Workspace
(Calendar, Gmail, Meet) via the googleapis SDK. The worker runs on Node 20 and is managed
as a pnpm workspace package (`@octio/worker`).

---

## Prerequisites

- Node 20+
- pnpm (install via `corepack enable`)
- Docker Desktop (or Docker Engine) — for the local Postgres container
- A Google Cloud project with OAuth 2.0 credentials (see the Google OAuth section below)

---

## Local dev setup

1. Install dependencies from the repo root:

   ```
   pnpm install
   ```

2. Copy the env template and fill in values:

   ```
   cp worker/.env.example worker/.env
   ```

3. Start the Postgres container (from the repo root):

   ```
   docker compose up -d postgres
   ```

4. Run database migrations:

   ```
   pnpm --filter @octio/worker run db:migrate
   ```

5. Start the worker in development mode:

   ```
   pnpm --filter @octio/worker run dev
   ```

6. Verify the worker is healthy:

   ```
   curl http://localhost:3000/health
   ```

   The default port is 3000. Override it by setting `PORT` in `worker/.env`.

---

## Google OAuth one-time setup

This step captures a long-lived refresh token that the worker uses to interact with
Google Calendar, Gmail, and Google Meet on behalf of the Octio service account.

**You only need to do this once per environment (local, staging, production).**

### Step 1 — Create a Google Cloud project

1. Go to https://console.cloud.google.com
2. Create a new project named "Octio Agent" (or any name you prefer).

### Step 2 — Enable APIs

Enable the following APIs inside your project:

- **Google Calendar API**
- **Gmail API**
- **Google Meet REST API** (required for Phase 4 transcript features — can skip for Phase 1)

### Step 3 — Configure the OAuth consent screen

1. Navigate to: APIs and Services > OAuth consent screen
2. User type: choose **External** (or **Internal** if you have a Google Workspace domain)
3. Fill in the app name and support email
4. Add the following scopes:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/meetings.space.readonly` (Phase 4 only — can skip)
5. Under "Test users", add your own Google email address
6. Save and continue

You do not need to publish the app. Testing mode with your email as a test user is sufficient.

### Step 4 — Create OAuth 2.0 credentials

1. Navigate to: APIs and Services > Credentials > Create Credentials > OAuth client ID
2. Application type: **Desktop app**
3. Add the following to **Authorized redirect URIs**:

   ```
   http://localhost:3005/oauth2callback
   ```

4. Click Create and download the JSON file

### Step 5 — Add credentials to worker/.env

Open `worker/.env` and fill in:

```
GOOGLE_CLIENT_ID=<client_id from the JSON>
GOOGLE_CLIENT_SECRET=<client_secret from the JSON>
GOOGLE_SENDER_EMAIL=hello@octio.co.za
OCTIO_TEAM_EMAIL=team@octio.co.za
```

### Step 6 — Run the token capture script

```
pnpm --filter @octio/worker run get-refresh-token
```

- Your default browser will open a Google consent page.
- Sign in with the Google account that will send calendar invites and emails.
- Grant the requested permissions.
- The script will print the refresh token in the terminal.

### Step 7 — Add the refresh token to worker/.env

Copy the printed token:

```
GOOGLE_REFRESH_TOKEN=<pasted token>
```

### Step 8 — Restart the worker

```
pnpm --filter @octio/worker run dev
```

---

## Troubleshooting

**"Port 3005 already in use"**

Find and stop whatever process is on that port:

```
lsof -ti tcp:3005 | xargs kill
```

Alternatively, edit `OAUTH_PORT` at the top of `worker/scripts/get-refresh-token.ts` and
update the redirect URI in Google Cloud Console to match the new port.

**"redirect_uri_mismatch" from Google**

The redirect URI registered in Google Cloud Console must exactly match what the script uses.
Verify that `http://localhost:3005/oauth2callback` (no trailing slash, no HTTPS) is listed
under your OAuth 2.0 client's Authorized redirect URIs.

**"access_denied"**

Your Google account was not added as a test user on the OAuth consent screen. Go to:
APIs and Services > OAuth consent screen > Test users, add your email, and try again.

**"No refresh_token in response"**

A refresh token was already issued for this OAuth client and Google account combination.
Revoke access at https://myaccount.google.com/permissions, find "Octio Agent", revoke it,
then re-run the script with `prompt: 'consent'` — which the script already sets.

**Refresh token stops working**

Refresh tokens do not expire unless explicitly revoked by the user or by Google (e.g., after
7 days if the app is in Testing mode and not verified). If the worker starts throwing 401s,
re-run the token capture script to get a fresh token.

---

## Running tests

```
pnpm --filter @octio/worker run test
```

---

## Building for production

```
pnpm --filter @octio/worker run build
```

This outputs compiled JavaScript to `worker/dist/`.

---

## Deploying to gen4

See Task 11 / Task 17 in the implementation plan for deployment steps to the gen4 VPS.
