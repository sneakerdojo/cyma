/**
 * One-time script: re-consent OAuth with admin scopes, then create
 * leads@octio.co.za and outreach@octio.co.za Google Groups.
 *
 * Usage: pnpm --filter @octio/worker run create-groups
 */
import { google } from 'googleapis';
import http from 'node:http';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 3005;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in worker/.env');
  process.exit(1);
}

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/admin.directory.group',
  'https://www.googleapis.com/auth/admin.directory.group.member',
  'https://www.googleapis.com/auth/contacts',
];

const url = auth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('');
console.log('====================================================');
console.log('OPEN THIS URL IN YOUR BROWSER:');
console.log('====================================================');
console.log(url);
console.log('====================================================');
console.log('');
console.log(`Waiting for OAuth callback on port ${PORT}...`);

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url!, `http://localhost:${PORT}`);
  const code = u.searchParams.get('code');
  if (!code) {
    res.end('No authorization code received');
    return;
  }

  try {
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);
    console.log('\nOAuth token exchange OK — new scopes granted\n');

    const admin = google.admin({ version: 'directory_v1', auth });

    // Create groups
    const groups = [
      {
        email: 'leads@octio.co.za',
        name: 'Octio Leads (Internal)',
        description:
          'Internal notification list — team receives alerts when new leads book via the website. Leads are NOT members of this group.',
      },
      {
        email: 'outreach@octio.co.za',
        name: 'Octio Outreach',
        description:
          'Outbound marketing list — leads are added as external members when they book. Send campaigns/newsletters to all past leads.',
      },
    ];

    for (const g of groups) {
      try {
        await admin.groups.insert({ requestBody: g });
        console.log(`Created ${g.email}`);
      } catch (err: any) {
        if (err.code === 409) {
          console.log(`${g.email}: already exists (OK)`);
        } else {
          console.error(`${g.email}: ${err.message}`);
        }
      }
    }

    // Add simekani@ as owner of leads@
    try {
      await admin.members.insert({
        groupKey: 'leads@octio.co.za',
        requestBody: { email: 'simekani@octio.co.za', role: 'OWNER' },
      });
      console.log('Added simekani@octio.co.za as owner of leads@');
    } catch (err: any) {
      console.log(
        `simekani@ leads membership: ${err.code === 409 ? 'already member' : err.message}`,
      );
    }

    // Add team@ as member of leads@
    try {
      await admin.members.insert({
        groupKey: 'leads@octio.co.za',
        requestBody: { email: 'team@octio.co.za', role: 'MEMBER' },
      });
      console.log('Added team@octio.co.za to leads@');
    } catch (err: any) {
      console.log(
        `team@ leads membership: ${err.code === 409 ? 'already member' : err.message}`,
      );
    }

    // Success response
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(
      '<h1 style="font-family:sans-serif;color:#E8862A">Done!</h1>' +
        '<p>Google Groups created. Check your terminal for the new refresh token.</p>' +
        '<p>You can close this tab.</p>',
    );

    console.log('');
    console.log('====================================================');
    console.log('UPDATE worker/.env with this new refresh token:');
    console.log('====================================================');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('====================================================');
    console.log('');
    console.log('Then restart the worker: pnpm --filter @octio/worker run dev');

    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 2000);
  } catch (err: any) {
    console.error('Token exchange failed:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error: ' + err.message);
    setTimeout(() => process.exit(1), 1000);
  }
});

server.listen(PORT, () => {
  import('open')
    .then((m) => m.default(url))
    .catch(() => console.log('(Could not auto-open browser — open the URL manually)'));
});

// 5-minute timeout
setTimeout(() => {
  console.log('Timeout — no OAuth callback received in 5 minutes');
  process.exit(1);
}, 300_000);
