# Session Notes — Marketing Site Production Launch + Internal Tools Foundation

**Dates:** 2026-05-10 through 2026-05-12
**Outcome:** Octio marketing site live on production at `https://octio.co.za`, full Google Workspace integration working end-to-end, and two specs ready for implementation (admin dashboard + content engine).

---

## TL;DR

In three days we took the `cyma` repo from a half-finished marketing site to a production-deployed AI lead-gen funnel with verified Gmail/Calendar/Admin Directory/Contacts integrations, then designed the next two internal tools (admin operations dashboard + content engine for social + newsletter).

The marketing site is **fully operational on production**. The two new tools are **specced but not yet built** — next session starts with `npm create mastra@latest octio-content` for the content engine, or the Phase 1 implementation of the admin dashboard, depending on priority.

---

## 1. Production status (verified live)

### Marketing site — https://octio.co.za

- HTTP 200, ~250ms TTFB
- Single primary CTA "Let's get you started!" + floating "Talk to our AI agent" FAB (FAB hides on Hero + Contact sections)
- Chat overlay lifted to App level — works on every route (homepage, product pages, service pages)
- 3D Octo orb reactive at the top of chat overlay (states: idle / thinking / speaking)
- Intent system live: clicking different CTAs starts the agent on different opener questions (general / contact / ask / onboard)
- Pricing hidden via `SHOW_PUBLIC_PRICING=false` flag; tier cards show "Enquire for pricing"
- SEO Phase 1 shipped: meta tags + JSON-LD + sitemap.xml + robots.txt + llms.txt + AI-crawler allow-list

### Worker on production — `octio-worker-prd` container on `infra-01` (41.203.14.10)

- Up healthy, on image `4e905f7` (scope-check fix included)
- Google OAuth scope check passes all four services: Calendar, Gmail, Admin Directory (Groups), Contacts
- Real Gmail send verified — Message ID `19e1b9449b55fe3a` arrived from `support@octio.co.za`
- Cron jobs running: `abandonment-recovery` + `follow-up-sequence` every 15 minutes
- New env values on prod: `GOOGLE_REFRESH_TOKEN` (5 scopes), `GOOGLE_SENDER_EMAIL=support@octio.co.za`
- Backup of pre-change env at `/opt/stacks/octio-website-prd/.env.worker.bak.20260512-114417`

### CI/CD — GitLab `octio-dev/octio-website`

- Build → Package → Deploy:QA → Deploy:Production pipeline fully working
- Registry auth on remote hosts via ephemeral `CI_JOB_TOKEN` (fixed mid-session)
- HEALTHCHECK in both web (nginx) and worker (Hono) Dockerfiles so the deploy waits correctly

---

## 2. Marketing-site work done this session

### CTA / conversion architecture refactor

- Stripped 5+ different CTA labels site-wide → single primary "Let's get you started!" + persistent "Talk to our AI agent" FAB
- Removed duplicate CTAs from Navbar, Contact section, Footer (Hero is the only on-page primary)
- Contact section heading updated to "Ready to deploy your AI Driven systems?"
- ProductDetailPage gets three intent-distinct entry points: hero "Ask Octo about this →" pill (`intent=ask`), pricing-tier "Ask Octo about this plan →" links (`intent=ask`), bottom primary "Get started with X" or "Scope X with the team" (`intent=onboard` for products, `intent=contact` for services)

### ChatOverlay lift (route-agnostic chat)

- Chat was previously nested inside `Hero.tsx` — only worked on `/`. Lifted to App level as `<ChatOverlay />`, rendered alongside Routes.
- Full-screen modal with solid `bg-bg` base + radial-gradient orange glow overlay
- Reactive 3D OctoScene at top, conversation content flowing beneath
- `OctoScene` rendered without `fullHeight` prop (the `fullHeight=true` branch zoomed camera to z=11 making the orb tiny)

### Intent system

- `WizardIntent = 'general' | 'contact' | 'ask' | 'onboard'` added to `WizardContext`
- `openWizard({ intent, service })` (backwards-compatible with old string signature)
- Intent piped through `OctoFreeChat` → `InteractiveChat` → `/chat/step` worker route → `steps.ts` step-0 promptFn
- Step 0 has 7 distinct branches: contact+offering, contact-only, ask+offering, ask-only, onboard+offering, onboard-only, general+offering, plain general — each generates a different opener with different option sets

### Octo agent prompt rewrite (`worker/src/prompts/octo-freechat.md`)

- "Acknowledge-then-advance" rule: reflect what user just said before pivoting
- "Conversational-not-interrogative" rule: no double-question fires
- Phase 3 enrichment block: 5 optional questions with explicit opt-out at every question + after-3-skips bail-out
- Identity capture moved to natural conversation point, not upfront gate

### Chat dead-end fix

- Replaced "All set — see you on the call" terminal screen with `DoneFollowUp` component
- Confirmation copy + textarea + "Send to the team" button so the user can drop a follow-up note before the call
- New event action `followup_question` in `/chat/event` schema

### Pricing visibility toggle (`src/data/products.ts`)

- `SHOW_PUBLIC_PRICING = false` flag + `PRICING_HIDDEN_LABEL = 'Enquire for pricing'`
- Single flip to restore all prices; data structures and pricing-tier components untouched

### SEO Phase 1

- `react-helmet-async` wired via `HelmetProvider`
- `src/components/SEO.tsx` — reusable component with default Octio meta tags + per-route overrides + JSON-LD builders (`OCTIO_ORGANIZATION_JSONLD`, `OCTIO_WEBSITE_JSONLD`, `buildOfferingJsonLd()`)
- `public/sitemap.xml` (8 URLs)
- `public/robots.txt` with explicit allows for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, anthropic-ai
- `public/llms.txt` per [llmstxt.org standard](https://llmstxt.org)
- `index.html` defaults updated

### HistoryDrawer

- Limited to last 3 entries

### "Cancel my data" POPIA flow (already in place, verified)

- `/privacy/delete` endpoint operational with token verification

---

## 3. Production infrastructure work

### Deployment pipeline fixes

| Problem | Fix |
|---|---|
| Deploy:QA failed — `pull access denied for worker registry` | Added `docker login --password-stdin $CI_REGISTRY` step on remote hosts using ephemeral `CI_JOB_TOKEN`, with `docker logout` after to keep creds short-lived |
| Deploy:QA failed — `timeout 60` on web/worker healthcheck | Added `HEALTHCHECK` directives to both `Prod.Dockerfile` (nginx: `wget --spider http://localhost/`) and `worker/Dockerfile` (Hono: `wget --spider http://localhost:3000/health`) |
| Deploy:QA failed — Alpine TLS error fetching `openssh-client` | Transient infra flake — retry of the same job succeeded |
| Merge conflict on `.gitlab-ci.yml` between local + remote | Kept local "worker healthcheck" lines, dropped local "gateway reload" lines (Traefik handles upstream re-resolve now) |

### Google OAuth — full 5-scope rebuild

- Initial state: `GOOGLE_REFRESH_TOKEN` had only Calendar + People; Gmail + Admin Directory failed with "Request had insufficient authentication scopes"
- Root cause analysis: Gmail API itself wasn't enabled on the OAuth client's project (`gmail-mcp-491217` in the `octio.co.za` Workspace org, project number `819395226223`)
- User had recently been granted Super Admin role → unlocked Admin SDK API access
- After Gmail + Admin SDK enabled, re-ran `worker/scripts/get-refresh-token.ts` and got all 5 scopes granted:
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/admin.directory.group`
  - `https://www.googleapis.com/auth/admin.directory.group.member`
  - `https://www.googleapis.com/auth/contacts`
- New refresh token deployed to prod via SSH-side `.env.worker` edit (backup taken), worker container recreated

### Scope-check probe fix (commit `4e905f7`)

- Bug: `gmail.users.getProfile({ userId: 'me' })` requires `gmail.readonly`/`gmail.metadata`, not `gmail.send` (the only Gmail scope we want)
- Probe was reporting false negatives ("Gmail scope check FAILED") even when send worked
- Fixed by replacing probe with passive check against `oauth2.googleapis.com/tokeninfo` endpoint — verifies `gmail.send` is in the access token's granted scopes without calling a Gmail API endpoint
- Confirmed end-to-end: real Gmail send from prod worker returns Message ID

### Gmail Send-as alias `support@octio.co.za`

- `hello@octio.co.za` Group created but verification email never arrived (Workspace Groups + external sender filtering complications)
- Pivoted to `support@octio.co.za` — verified Send-as alias on `simekani@octio.co.za`'s Gmail account
- Confirmed mail sends with `From: Octio <support@octio.co.za>` header on prod

### Deploy logistics

- Prod host identified as `41.203.14.10` (port 22, user `sys-admin`) via GitLab CI variable `DEPLOY_HOST_PROD`
- Stack location: `/opt/stacks/octio-website-prd/`
- Compose services: `postgres`, `web`, `worker`
- SSH key: `~/.ssh/infra-01-sys-admin-mesh_ed25519`
- Hostname on the box: `infra-01` (don't confuse with `replica-01` which is a different host)

---

## 4. Specs drafted this session

Both committed to `docs/superpowers/specs/` and pushed to GitHub.

### 4.1 Admin Dashboard — `2026-05-12-admin-dashboard-design.md`

**Status:** Draft, awaiting checklist sign-off.

Internal operations cockpit at `/admin/*` route inside the existing Vite app. Four surfaces:
1. Lead inbox — every chat session with status / intent / contact details
2. Bookings calendar — today/week's calls + call brief
3. Agent observability — funnel, recent conversations, anomalies
4. Ops health — cron run history + email send log + retry

**Auth:** env-var allowlist of email + bcrypt-hashed password (user explicitly chose this over Google SSO for speed). JWT-cookie session, 7-day expiry. Migration path to Google SSO documented.

**Phase breakdown:**
- Phase 1 (6 days): v1 baseline with all four surfaces, light filtering, no realtime
- Phase 2 (5–6 days): inline edit, saved views, bulk actions, CSV, charts, cmd-K, SSE
- Phase 3 (6–7 days): calendar view, Kanban, audit diff viewer, approval gates, webhooks
- Phase 4 (6–10 weeks separate effort): multi-tenant SaaS productisation

**Multi-tenant readiness rules** (§9.5) — applied to every Phase 1–3 commit so Phase 4 doesn't require a rewrite. Every new table has `tenant_id`, every read query scopes by it, no hardcoded "Octio" strings, etc.

### 4.2 Content Engine — `2026-05-12-content-engine-design.md`

**Status:** Approved (brainstorm + research pass on 2026-05-12).

One repo (`octio-content`, separate from `cyma`) powering both externally-marketed SKUs: AI Social Media Manager + The Newsletter Engine. Customers can buy either SKU separately or both bundled — codebase doesn't know or care.

**Four Mastra agents:** ContentStrategist, LinkedInDrafter, NewsletterDrafter, TikTokDrafter. Strategist plans a week; Drafters fill the slots; human approves; Publisher cron posts.

**Locked decisions:**
- Phase 1 sliced into 1a (LinkedIn + Newsletter, ~12 days) and 1b (TikTok + Beehiiv adapter, ~5 days)
- LinkedIn API: Community Management API on personal profile (`simekani@octio.co.za`), scopes `openid profile email w_member_social` (note: `r_liteprofile` is deprecated)
- Newsletter sender: DIY via Octio's Gmail API in Phase 1a; `NewsletterSender` interface so Beehiiv/Mailchimp/Resend are drop-in adapters in 1b/Phase 4
- Source curation: Discord bot — ships BOTH a `/source <url>` slash command (rejection-proof) AND a channel listener on `#newsletter-sources` (ergonomic default)
- Brand voice: structured JSON consumed by all drafter agents
- TikTok: brief-only in v1 (script + shot list, human shoots video) — no auto-video generation

**Research pass (§16)** verified:
- Mastra hit 1.0 in January 2026 (`npm create mastra@latest <name>` for scaffolding)
- Gmail bulk-sender enforcement ramps from Nov 2025 — RFC 8058 one-click unsubscribe + Postmaster Tools monitoring + 48-hour unsubscribe SLA all required from day 1
- Firecrawl free tier (1k pages/month) is plenty for Phase 1a's ~150 pages/month
- TikTok unaudited mode is SELF_ONLY visibility — apply for audit early in Phase 1b

**Execution plan:** `~/.claude/plans/staged-marinating-quill.md`

---

## 5. Tasks still pending

### Marketing site
- [ ] Dependabot vulnerabilities: 8 high, 23 moderate, 2 low on GitHub default branch — schedule a dependency-bump PR
- [ ] Phase 2 SEO: pre-rendering of marketing routes for crawlers that don't run JS (vite-plugin-prerender or similar)
- [ ] Visual screenshot verification of all 4 detail pages at 1440px + 375px (admin pages have been covered)

### Admin Dashboard
- [ ] User signs off on the §1–§15 approval checklist
- [ ] Answer open question #1 (login page placement) and #4 (cron retention)
- [ ] Implement Phase 1 (6 days estimate)

### Content Engine
- [ ] User signs off on the spec checklist
- [ ] Confirm repo name (`octio-content` proposed) and deploy host
- [ ] Scaffold new repo: `npm create mastra@latest octio-content` + Vite frontend
- [ ] Apply for LinkedIn Community Management API access (day 1 — usually instant for `w_member_social`)
- [ ] Implement Phase 1a (12 days estimate)

### Email infrastructure
- [ ] Set up Google Postmaster Tools verification for `octio.co.za` before sending first bulk newsletter
- [ ] Consider creating `newsletter@octio.co.za` Send-as alias for distinct sender reputation from booking emails

### Cleanup
- [ ] Resolve the `hello@octio.co.za` group — verification dance was abandoned mid-session. Either delete the group or finish the verification + add `hello@` as a second Send-as alias for general inquiries.

---

## 6. Key files (where to find what)

### Marketing site source
| Concern | File |
|---|---|
| Single primary CTA | `src/components/Hero.tsx` |
| Floating chat launcher | `src/components/ChatLauncher.tsx` |
| Site-wide chat overlay | `src/components/ChatOverlay.tsx` |
| Intent system | `src/features/octo/WizardContext.tsx` |
| Intent-aware step 0 prompts | `worker/src/conversation/steps.ts` (lines 196–390) |
| Octo prompt rules | `worker/src/prompts/octo-freechat.md` |
| Pricing toggle | `src/data/products.ts` lines 30–46 |
| Post-booking continuation | `src/features/chat/InteractiveChat.tsx` — `DoneFollowUp` component |
| SEO component | `src/components/SEO.tsx` |
| Sitemap / robots / llms.txt | `public/` |

### Worker
| Concern | File |
|---|---|
| Google OAuth flow primitives | `worker/src/services/google-oauth-flow.ts` |
| Refresh-token CLI | `worker/scripts/get-refresh-token.ts` |
| Boot-time scope check | `worker/src/services/google-scope-check.ts` (Gmail probe via tokeninfo) |
| Gmail send | `worker/src/services/gmail.ts` |
| Calendar | `worker/src/services/calendar.ts` |
| Bookings route w/ graceful degradation | `worker/src/routes/book.ts` |
| Cron registry | `worker/src/cron/index.ts` |
| Event tracking schema | `worker/src/routes/event.ts` (action enum includes `followup_question`) |

### Infrastructure
| Concern | File |
|---|---|
| CI pipeline | `.gitlab-ci.yml` |
| Web image | `Prod.Dockerfile` |
| Worker image | `worker/Dockerfile` |
| Compose (local) | `docker-compose.yml` |
| Nginx config | `ops/nginx.conf` |

### Specs & plans
| Doc | Location |
|---|---|
| Admin Dashboard design | `docs/superpowers/specs/2026-05-12-admin-dashboard-design.md` |
| Content Engine design | `docs/superpowers/specs/2026-05-12-content-engine-design.md` |
| Content Engine Phase 1a plan | `~/.claude/plans/staged-marinating-quill.md` |
| This session notes file | `docs/session-notes/2026-05-10-12-marketing-site-prod-launch-and-internal-tools-foundation.md` |

---

## 7. Decisions log (chronological)

1. **Intent system over generic CTAs** — every CTA carries an intent (general/contact/ask/onboard); chat opener varies per intent. Avoids the "wall of identical CTAs" problem.
2. **ChatOverlay at App level, not inside Hero** — chat must work on every route, not just `/`.
3. **Pricing hidden in v1** — `SHOW_PUBLIC_PRICING = false` flag. Lets us start sales conversations without committing to public price lists.
4. **`SnowflakeNewsletterSender` interface pattern adopted** *(name pending)* — sender adapters are pluggable so we own the abstraction; Gmail adapter ships first, Beehiiv/Mailchimp/Resend slot in later.
5. **Env-creds auth over Google SSO for admin dashboard v1** — user explicitly chose this for speed. JWT-cookie session pattern is auth-mechanism-agnostic so SSO migration is a single endpoint swap later.
6. **Separate repos for tools (not monorepo)** — `octio-content` is a new repo. Discussed monorepo briefly; user picked separate to keep concerns isolated. Shared types/Tailwind config can be published as npm package later if pain shows up.
7. **TikTok brief-only in v1** — agent generates script + shot list + caption; human shoots/uploads. Auto-video generation deferred — quality isn't there yet for B2B at current price points.
8. **Discord channel listener + slash command together** — slash command is rejection-proof for Discord's MessageContent intent review; listener is the ergonomic default. Both ship Phase 1a.
9. **Multi-tenant readiness rules applied from day 1 of every Phase 1–3 work** — `tenant_id` on every table, no hardcoded "Octio" strings, env-driven config that becomes per-tenant later. Phase 4 SaaS becomes a config layer not a rewrite.
10. **Support@octio.co.za as the verified sender alias** (not hello@) — hello@ Group's verification email never made it through external-sender filtering; pivoted.

---

## 8. Things to remember for next session

- **Login to GitLab git auth has been flaky** — the osxkeychain cache expires; `git credential reject` for `gitlab.com` + retry usually fixes it. Or use `glab auth setup-git`.
- **GitHub origin is `sneakerdojo/cyma`**, GitLab is `octio-dev/octio-website`. Push to `origin` for code review (GitHub), `gitlab` for CI/deploy.
- **GitHub flagged 33 Dependabot vulnerabilities** (8 high, 23 moderate, 2 low) — separate dependency-bump pass when time permits.
- **Worker `tsx watch` is sensitive to `shared/` build state** — if `@octio/shared` isn't built, worker won't start. Run `pnpm --filter @octio/shared build` after pulling.
- **Mastra reached 1.0 (Jan 2026)** — `npm create mastra@latest` is the scaffolding command for the new content engine repo.
- **LinkedIn `r_liteprofile` is deprecated** — use `openid profile email w_member_social` scopes.
