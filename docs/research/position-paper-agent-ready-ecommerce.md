# Position Paper: Making Octio Agent-Ready — And What We Should Actually Build

**Date:** 2026-09-03
**Type:** Synthesis (position paper), drawing on three completed research streams — no new primary research beyond what's cited back to those reports.
**Sources synthesized:**
- `docs/research/mcp-interop.md` (branch `worktree-agent-a92e17a01af7653bc`) — "MCP"
- `docs/research/sa-agent-payments.md` (branch `worktree-agent-af42d632d319d8d90`) — "SA-Payments"
- `docs/research/agent-payment-gateway-feasibility.md` (branch `worktree-agent-a1693520efc23ee50`) — "Gateway-Feasibility"

**Question this answers:** How does Octio (a small SA events/services company running a Hono/Mastra worker) become "agent-ready," and what, concretely, should we build?

---

## 1. The verdict, stated plainly

**Build the MCP interop layer. Do not build payment infrastructure. Skip a booking-write flow for now.**

Octio's honest, non-hyped product angle is: *become genuinely agent-discoverable and agent-bookable via a read-mostly MCP surface, exposing the chat agent Octio already has* — not a payments play, not an infrastructure company, not a bet on a regulatory or protocol shift that hasn't happened yet. This is a scoping decision, not a hedge: every payments-adjacent option this research touched is either already cornered by incumbents (Gateway-Feasibility) or not yet buildable without absorbing regulatory/liability risk no SMB should carry alone (SA-Payments). The one thing that's cheap, low-risk, and uses infrastructure Octio already paid for (Mastra + Hono) is the MCP surface (MCP §2). Do that first. Do it alone, for now.

---

## 2. How the three reports connect

Read independently, these are three answers to three different questions. Read together, they form one funnel:

**Gateway-Feasibility answers "should we build agent payment infrastructure" with a flat no** — Visa (TAP), Mastercard (Agent Pay/AP4M), Stripe (ACP), and Google (AP2) have already shipped the cryptographic-identity, scoped-token, mandate/consent layer a startup would build, "with real named merchants and processor partners, not just white papers" (Gateway-Feasibility §Verdict). The one open gap — binding liability/dispute allocation for agent-initiated transactions — "is not a startup wedge either... it gets settled by network operating rules... not by a venture-funded API layer sitting on top of protocols it doesn't control" (Gateway-Feasibility §Verdict). This closes off the ambitious version of "Octio builds agent payments" before it's worth considering: even a well-funded startup shouldn't try this; a two-person SA services company definitely shouldn't.

**SA-Payments narrows the question to "is there anything left to build regionally" and finds a real but narrow yes** — SARB and PASA have published *nothing* agent-specific (SA-Payments §2, "the clearest finding in the whole research pass"), so there's no compliance path to plug into even if we wanted to. But the underlying rails — Peach/Stitch tokenization, Capitec+Stitch Variable Recurring Payments (a spending-capped, pre-authorized mandate structure launched Dec 2025), PayShap's push-payment model — already exist and are usable *today*, independent of any card-network agent protocol (SA-Payments §1.1, §4). The report's own framing is exactly the shape Octio should take: "a scoped, spending-capped, pre-authorized recurring mandate rather than an open 'buy anything' credential... is technically buildable in SA now... without waiting for SARB or a card-scheme agent protocol" (SA-Payments §4). Its spin-off idea makes the same point explicitly: confirm whether a scoped VRP/MIT-based "agent purchasing" pilot is buildable on Peach/Stitch/Capitec rails alone (SA-Payments §Spin-off idea).

**MCP answers the question these two payments reports implicitly beg — "if not payments, what's the actual product surface for an agent interacting with Octio at all" — and the answer is discovery/booking, not money movement.** MCP's core finding is that the protocol layer has won ("every major model vendor supports it natively," MCP §1c Verdict) while the *public implementation ecosystem* is mostly insecure demo-ware (41% no auth, 36.7% SSRF-vulnerable, 30+ CVEs — MCP §1c). Critically, Octio's own stack removes the build cost that makes MCP a real decision for most companies: Mastra ships `MCPServer` plus a Hono adapter designed to bolt onto exactly the app Octio already runs (MCP §2, "the single biggest de-risking fact in this research"). The effort is turning on a capability, not building one from a cold framework choice.

**The connective tissue across all three:** Octio does not need to solve agent *payments* to be agent-ready — it needs to solve agent *discovery and booking-request initiation*, which MCP already covers, using infrastructure Octio already has. Payments — whether via global card-network rails (Gateway-Feasibility) or SA-specific pre-authorized mandates (SA-Payments) — is a second-order concern that only becomes relevant *after* an agent can reliably find, query, and request a booking from Octio. Build the funnel's entry (MCP discovery), not its exit (payment execution).

---

## 3. What "agent-ready" concretely means for Octio, in scope order

### 3a. Do now — read-only MCP surface (cheap, low-risk, uses existing stack)
Per MCP §2's concrete proposal, mapped to Octio's actual routes:
- `search_services` / `search_products` — reuse the logic already backing `/products/:slug` and `/services/:slug`.
- `get_service_detail` / `get_product_detail`.
- `get_availability` — the one genuinely new capability vs. what a browser-automation agent (Operator-style) can already scrape today, since availability is dynamic/calendar-backed (MCP §3, "the honest case for").

Effort: "days not weeks" for the tool wrapping; the Hono/Mastra mount is near-zero new infrastructure per Mastra's own docs (MCP §2 point 2). The generic SMB MCP-build cost figures ($25k–$50k) cited in MCP research explicitly do **not** apply to Octio — that estimate assumes building from a cold framework, and Octio already has Mastra + a working agent + Hono (MCP §2, final paragraph).

### 3b. Do carefully, second — expose the chat agent as the tool, not raw CRUD
MCP §2 flags this directly: Octio's existing phase-based tool routing and hallucination-guard work (visible in the current branch's own recent commits — phase routing, hallucination guard, forced `show_form` on qualify entry) already encodes business-logic guardrails that a raw external MCP tool surface would otherwise have to reimplement or risk bypassing. The safer v1 shape is "expose the agent as a callable tool for another agent to delegate to," not "expose `create_booking_request` as a raw write." This preserves the guardrail investment already in the codebase instead of building a parallel unguarded path next to it.

Authentication is where the real remaining effort sits: OAuth 2.1 via a managed provider (WorkOS, Stytch, Cloudflare's OAuth provider) is the documented 2026 default, "budget this as the majority of the effort, not the tool definitions" (MCP §2 point 3). This is consistent with the project's existing posture of using managed providers over hand-rolled infra (catalog-dep pattern, Docker patterns).

### 3c. Do not do yet — a write-through `create_booking_request` that instantly writes to Calendar
MCP §2 itself calls this "almost certainly not" v1: "a tool that lets an anonymous external agent instantly write confirmed calendar events is an abuse/spam vector on day one." A pending-request model that still routes through existing human/Calendar confirmation logic is the realistic version, and even that should wait until 3a/3b are live and the guardrail-preserving pattern is proven.

### 3d. Do not build — an agent payment gateway or authorization layer
Per Gateway-Feasibility's flat verdict: this is fully cornered by Visa/Mastercard/Stripe/Google at the protocol layer, and the one open gap (liability allocation) will be settled by those networks, not by outside API layers. This is disqualified regardless of Octio's size — it's not "too small to attempt," it's "the wrong problem to attempt."

### 3e. Not yet, revisit later — a scoped SA pre-authorized booking-deposit pilot
This is the one payments-adjacent idea that survives scrutiny, but it is explicitly a *later* phase, gated on 3a/3b existing and proving out first, and it is small in scope by design: a spending-capped Capitec/Stitch VRP-style mandate for booking deposits specifically (not general "buy anything"), per SA-Payments §4's own framing. No regulatory guidance exists to build against (SARB/PASA silent — SA-Payments §2), so this carries real liability exposure that a small company should not take on speculatively; it only becomes worth doing if agent-initiated booking *volume* through the MCP surface (3a/3b) justifies the build and legal review. Treat this as a phase-2 experiment, not a phase-1 commitment, and revisit only once 3a/3b show actual agent-mediated traffic worth monetizing.

---

## 4. Why this is the honest answer, not the hyped one

- **No evidence of demand yet.** MCP §3 is explicit: "no source found quantifies conversion or traffic from agent-mediated bookings specifically for an events/services SMB... the report found no evidence either way on whether this channel currently produces revenue for comparable SMBs." We are not chasing a proven channel — we're taking a cheap option on one because the cost of taking it is low (existing stack) and the cost of not having it is a new competitive-parity gap once other services sites do.
- **The bigger, harder-sounding play (payments) is explicitly disqualified by adversarial research, not by our own risk aversion.** Gateway-Feasibility isn't hedging — it's telling us plainly not to build this, backed by "real named merchants and processor partners" already live from Visa/Mastercard/Stripe/Google.
- **The SA-specific payments opportunity is real but not urgent.** It requires no new external permission (SA-Payments §4 — "buildable in SA now... without waiting for SARB"), but it also requires no new *urgency* — nothing forces Octio to build it before there's a proven reason to (agent-mediated booking volume). Building it speculatively means absorbing untested liability (SA-Payments §2: "liability currently defaults to the human principal, with no tested framework for disputing an agent-initiated purchase") for a channel with unquantified demand.
- **The MCP surface, by contrast, has near-zero downside if scoped to read-only.** It doesn't require new legal exposure, doesn't require betting on protocol churn resolving in any particular direction (MCP has already won the interop argument per MCP §1c), and reuses guardrail work already committed to this branch's own recent history.

**Bottom line for a small SA services company:** the cheap, honest move is to expose what already exists (catalog, availability, the guarded chat agent) through the interop standard that's already won, using the stack already chosen. Skip payments entirely until there's a measured reason not to.

---

## 5. Concrete next step (if this paper is accepted)

1. Wrap `search_services`, `get_service_detail`, `get_availability` as Mastra tools on the existing worker (reuse of REST-route logic).
2. Mount via Mastra's Hono `MCPServer` adapter on the existing worker app.
3. Ship read-only, unauthenticated (catalog data is already public) as v1; defer OAuth 2.1 setup until a write-capable tool (`create_booking_request` or the agent-as-tool pattern) is scoped.
4. Before investing in registry/directory publishing (MCP §2 point 4 — landscape is fragmented, no canonical winner yet), pull worker access logs for existing agent/bot user-agent traffic (OpenAI Operator, ChatGPT-user, Claude, Perplexity, GPTBot) to get a real baseline instead of speculating — this is MCP's own first spin-off idea and it's the fastest way to convert "unproven business case" into an actual number.
