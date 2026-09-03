# MCP as Interop: Research Report

**Type:** Technical research (decision-shape: explore)
**Date:** 2026-09-03
**Method:** Native web fan-out (BMAD `bmad-deep-recon` scaffolding was not installed in this repo — `_bmad/` absent — so this run was executed directly via `WebSearch`, without the memlog/digest tooling. Findings and sourcing discipline follow the same bar: every claim below is sourced, dated where the source dates it, and freshness-flagged where the underlying source itself is unverified marketing copy.)
**Decision this serves:** Whether/how Octio should expose a public MCP surface for octio.co.za, and what that would actually take given the existing Hono worker + AI SDK/Mastra chat agent.

---

## 1. How AI agents actually call other services today (2026)

There are three distinct interop patterns in production right now, and they are not competing so much as layered:

### 1a. MCP — agent-to-tool (vertical)
MCP is the standard for an agent reaching into **its own toolbox** — a defined set of callable tools/resources a server exposes, invoked by an agent the *user* is running (Claude, ChatGPT, Gemini, a custom app). Anthropic donated MCP to the newly formed **Agentic AI Foundation (AAIF)** under the Linux Foundation in December 2025, with Anthropic, Google, OpenAI, Microsoft, AWS, and Block as co-founding members; AAIF reportedly had ~190 member organizations by May 2026, cementing MCP as a vendor-neutral standard rather than an Anthropic-only artifact. ([toloka.ai](https://toloka.ai/blog/the-future-of-mcp-enterprise-adoption/), [a2a-mcp.org](https://a2a-mcp.org/blog/mcp-2026-roadmap))

Adoption numbers being circulated (97M monthly SDK downloads, 9,400+ public servers) come from secondary "state of MCP" blog aggregators, not from AAIF or Anthropic primary sources — treat as directionally true but unverified-at-source. What is better corroborated: **Stacklok's 2026 software report** puts 41% of surveyed software organizations in limited-or-broad MCP production, and Gartner is cited projecting 40% of enterprise apps will embed task-specific AI agents by end of 2026 with MCP as the dominant connective layer. ([digitalapplied.com](https://www.digitalapplied.com/blog/mcp-adoption-statistics-2026-model-context-protocol))

The **2026-07-28 MCP spec revision** moved the protocol toward a stateless architecture specifically to remove friction from running MCP servers at scale (e.g., as a bare Cloudflare Worker with no persistent session state required). ([blog.modelcontextprotocol.io](https://blog.modelcontextprotocol.io/posts/2026-07-28/), [blog.cloudflare.com](https://blog.cloudflare.com/mcp-v2/))

### 1b. A2A — agent-to-agent (horizontal)
Google's **Agent2Agent (A2A)** protocol handles agent-to-peer-agent collaboration — one agent delegating a sub-task to another agent it doesn't own/control, as opposed to MCP's agent-to-tool relationship. AAIF now governs both A2A and MCP and is explicitly working on making the two interoperate cleanly. The practical pattern reported for 2026 multi-agent systems: **A2A stitches a mesh of specialist agents together; MCP wires each individual agent in that mesh to its own tools/data.** Octio's chat agent is a single agent talking to its own tools/DB — A2A is not relevant to Octio's near-term decision; it matters only if Octio later wants its agent orchestrated *by* an external agent mesh (e.g., a travel-planning meta-agent calling into Octio's agent as a peer). ([onereach.ai](https://onereach.ai/blog/guide-choosing-mcp-vs-a2a-protocols/), [blog.mcpservers.org](https://blog.mcpservers.org/posts/a2a-vs-mcp))

### 1c. Plain browser automation (no protocol at all)
A large share of real-world "agent visits a website" traffic in 2026 still isn't MCP at all — it's **browser-use agents** (OpenAI's Operator being the most cited example) clicking, typing, and scrolling a normal web UI exactly like a human, with zero merchant-side integration required. This is the fallback path for any site that hasn't built MCP/agentic-commerce support, and it is what agents do against Octio's site *today*, with no work required on Octio's part. ([eco.com](https://eco.com/support/en/articles/14839400-what-is-agentic-commerce-the-2026-guide))

### Payments/commerce layer
Where money changes hands, a further protocol layer sits on top of MCP: Google's **Agent Payments Protocol (AP2)** and Coinbase's **x402** are both cited as 2026 payment-authorization standards for agentic commerce, separate from MCP itself (MCP = "what tools exist and how to call them"; AP2/x402 = "how the agent proves it's authorized to pay"). Not relevant to a first Octio MCP surface (Octio doesn't need agent-initiated payment execution as v1), but relevant context if a booking-deposit flow is ever exposed. ([bitontree.com](https://www.bitontree.com/agentic-commerce-ai-agents-payments-ap2-x402))

**Verdict on hype vs. real:** MCP-as-a-standard has won the argument — every major model vendor supports it natively, and vendor-maintained official remote servers exist from GitHub, Stripe, Cloudflare, Shopify (four official servers as of April 2026), and others. What's *not* mature yet is the operational layer: authentication, discovery/registry trust, and security posture. Independent scans in 2026 found the majority of the ~7,000+ public MCP servers carry exploitable risk — **41% require no authentication at all**, **36.7% are SSRF-vulnerable**, and researchers filed 30+ CVEs against MCP servers in early 2026. So: the protocol is real and shipping; the median public *implementation* is closer to demo-ware from a security standpoint. A credible production MCP server in 2026 is expected to sit behind OAuth 2.1 (the current spec mandates OAuth for remote servers), typically via a managed provider (Stytch, Auth0, WorkOS, Cloudflare's `workers-oauth-provider`, Composio Strata) rather than hand-rolled auth. ([digitalapplied.com](https://www.digitalapplied.com/blog/mcp-adoption-statistics-2026-model-context-protocol), [zeo.org](https://zeo.org/resources/blog/mcp-server-economics-tco-analysis-business-models-roi), [workos.com](https://workos.com/blog/best-mcp-server-authentication-providers))

---

## 2. What a public Octio MCP surface would concretely look like

### Technical fit with the existing stack
Octio's chat agent is already built with **AI SDK + Mastra** on the Hono worker. This matters a lot: Mastra ships a first-class `MCPServer` class specifically to expose existing Mastra tools/agents as an MCP server (stdio or SSE/HTTP transport), and Mastra's **Hono server adapter** is designed to bolt MCP + agent + workflow HTTP endpoints directly onto an app already running Hono — i.e., onto exactly the app Octio already has, without standing up a second server process. This is the single biggest de-risking fact in this research: Octio would not be building MCP support from a cold framework choice, it would be turning on a capability the chosen stack already anticipates. ([mastra.ai/reference/tools/mcp-server](https://mastra.ai/reference/tools/mcp-server), [mastra.ai/docs/server/server-adapters](https://mastra.ai/docs/server/server-adapters), [github.com/mastra-ai/mastra server-adapters/hono](https://github.com/mastra-ai/mastra/blob/main/server-adapters/hono/src/index.ts))

### What would plausibly be exposed
Given Octio is an events/services/booking company site, a first-cut MCP tool surface (mirroring the shape of what's already reported for merchant/booking MCP servers — `searchProducts`, `getProduct`, `getInventory`, `createCart`, `getShippingOptions` in the commerce analogue) would map to something like:

- `search_services` / `search_products` — query the existing services/products catalog by slug, category, keyword.
- `get_service_detail` / `get_product_detail` — full detail for one item (pulling from the same data the `/products/:slug` and `/services/:slug` routes already render).
- `get_availability` — read-only slot/calendar availability (this is the one genuinely new capability an external agent gets that a scraping/browser-automation agent could not reliably get today, since availability is dynamic and calendar-backed).
- `create_booking_request` — almost certainly **not** a direct write-through to confirmed booking; the realistic v1 is "create a pending request" that still routes through existing human/Calendar confirmation logic, given Octio's worker already integrates Google Calendar/Groups for this. A tool that lets an anonymous external agent instantly write confirmed calendar events is an abuse/spam vector on day one.
- `chat_with_agent` (optional) — expose the existing Mastra chat agent itself as a callable tool/sub-agent for another agent to delegate a conversational booking flow to, rather than exposing raw CRUD tools. This is the "expose the agent, not just the database" pattern and is arguably the more defensible v1 scope, since Octio's phase-based tool routing and hallucination-guard work (visible in recent commits: `d015a6e`, `7cb1210`, `ae0b67f`, `1b60ef2`) already encodes the business logic/guardrails that a raw external MCP tool surface would otherwise have to reimplement or risk bypassing.

### Integration effort
This is genuinely low-to-moderate, not a rebuild, **for the read-only surface**:

1. Wrap existing service/product/availability queries as Mastra tools (largely: reuse of logic already backing the worker's REST routes) — small effort, days not weeks.
2. Mount `MCPServer` via the Hono adapter on the existing worker app — per Mastra's own docs this is designed to be near-zero new infrastructure. ([mastra.ai/guides/getting-started/hono](https://mastra.ai/guides/getting-started/hono))
3. Add OAuth 2.1 in front of anything beyond pure read-only public catalog data — this is where real effort and a real decision point live. A managed provider (WorkOS, Stytch, Cloudflare's OAuth provider) is the documented 2026 default rather than hand-rolling it, and is consistent with the project's existing "don't build what a managed provider already solves" posture (see catalog-dep and Docker patterns in the codebase). Budget this as the majority of the effort, not the tool definitions.
4. Registry/discoverability: to be found by agents at all, Octio would want to publish the server to whatever public MCP registry/directory ecosystem exists at the time (the market of directories — mcpservers.org, mcp.directory, awesome-mcp-servers lists — is itself fragmented and unstable in 2026, per the search results above; no single canonical registry has won yet).

Generic industry cost figures cited for SMB MCP server builds ($25k–$50k for an MVP, per one vendor-economics blog) should be treated with real skepticism for Octio's case specifically — that figure assumes building MCP tooling from scratch on a stack with no prior agent-framework investment. Octio already has Mastra + a working agent + Hono; the marginal cost is much closer to "expose 3-5 tools + add OAuth" than a from-scratch MCP build. Still, no primary source gives an Octio-shaped estimate — this is inference from stack fit, not a sourced number, and should be flagged as such if it goes into planning docs. ([zeo.org](https://zeo.org/resources/blog/mcp-server-economics-tco-analysis-business-models-roi))

---

## 3. Business case — what's the actual argument for doing this

**The honest case for:**
- Octio's blocker to being "agent-discoverable" isn't zero today — a browser-automation agent (Operator-style) can already navigate octio.co.za with no work on Octio's side. So the *increment* MCP buys isn't "agents can reach us at all," it's (a) more reliable structured access than screen-scraping a chat widget, and (b) access to genuinely dynamic data (real-time availability) that a static crawl/browser session can't get as cleanly.
- The stack-fit argument is real and load-bearing: Mastra + Hono already anticipates this exact move, so the option value of building it is cheap relative to a generic company evaluating MCP cold.
- If Octio's actual near-term customer acquisition channel involves AI shopping/booking assistants (ChatGPT, Gemini, Claude, Operator-class agents) doing discovery/booking on behalf of end users, being one of the "500+ APIs" a general merchant MCP aggregator already indexes, or being directly queryable, is a plausible-but-unproven acquisition channel — no source found quantifies conversion or traffic from agent-mediated bookings specifically for an events/services SMB. This is the single biggest open question and the report found **no evidence either way** on whether this channel currently produces revenue for comparable SMBs.

**The honest case against / real risks:**
- Security posture is the dominant 2026 finding across every search: a majority of public MCP servers are insecure by default (no auth, SSRF-vulnerable). Shipping a naked MCP endpoint would be materially worse than not shipping one — it would be a new unauthenticated write-capable surface next to a booking/calendar system, which is a genuine incident risk, not a hypothetical one.
- No canonical, stable registry exists yet for discovery — so "publish an MCP server" doesn't automatically mean "agents find you," undermining the acquisition-channel argument until the ecosystem consolidates.
- Governance/protocol churn is ongoing (spec revised July 2026, AAIF still reconciling MCP/A2A) — building against a moving target has real maintenance cost for a small team.
- The read-only version (search/detail/availability) is low-risk and plausibly worth doing opportunistically; the write version (create_booking_request) is where cost/risk genuinely rises and where the guardrail work already in the chat agent (phase-based tool routing, hallucination guard) would need to be reused rather than bypassed — arguing for "expose the agent as a tool" over "expose raw CRUD tools" as the safer v1 shape.

**Bottom line:** Building a narrow, read-only MCP surface (catalog + availability) on the existing Mastra/Hono stack is cheap and low-risk, but its business payoff is currently unproven for an SMB in this vertical — no sourced evidence of agent-mediated booking revenue for comparable companies was found in this research. A write-capable surface (bookings) is where cost, security risk, and guardrail-preservation work concentrate, and should not be v1.

---

## 4. Open questions (not answered by this research)

- Does any comparable SMB (regional events/services/booking company) report measurable revenue or lead-gen from an MCP surface specifically, as opposed to general AI-search visibility? Not found.
- Which MCP registry/directory (if any) will matter for discoverability by late 2026 — the directory landscape itself looked fragmented in this search.
- Whether Octio's actual traffic includes any agent-mediated visits today (Operator-style or otherwise) — this would require log analysis, not web research, and would materially change the urgency case.

## Spin-off ideas (surfaced, not queued)

- Audit worker access logs for existing bot/agent-style user agents (OpenAI Operator, ChatGPT-user, Claude, Perplexity, GPTBot, etc.) hitting octio.co.za today, to get an actual baseline before speculating about an acquisition channel.

---

### Sources
- [The future of MCP: 2026 roadmap, enterprise adoption, and what comes next — Toloka](https://toloka.ai/blog/the-future-of-mcp-enterprise-adoption/)
- [The 2026-07-28 Specification — MCP Blog](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [MCP Adoption Statistics 2026 — Digital Applied](https://www.digitalapplied.com/blog/mcp-adoption-statistics-2026-model-context-protocol)
- [MCP Roadmap 2026 — a2a-mcp.org](https://a2a-mcp.org/blog/mcp-2026-roadmap)
- [The best providers for MCP server authentication in 2026 — WorkOS](https://workos.com/blog/best-mcp-server-authentication-providers)
- [What the Best MCP Gateways Do in 2026 — Zuplo](https://zuplo.com/blog/what-the-best-mcp-gateways-do-in-2026)
- [The state of MCP servers in 2026 — Tool Directory](https://tooldirectory.ai/blog/state-of-mcp-servers-2026)
- [MCP vs A2A: Protocols for Multi-Agent Collaboration 2026 — OneReach](https://onereach.ai/blog/guide-choosing-mcp-vs-a2a-protocols/)
- [A2A vs MCP: How the Two Agent Protocols Fit Together — mcpservers.org blog](https://blog.mcpservers.org/posts/a2a-vs-mcp)
- [What Is Agentic Commerce? The 2026 Guide — Eco](https://eco.com/support/en/articles/14839400-what-is-agentic-commerce-the-2026-guide)
- [Agentic Commerce in 2026: AP2, x402 and AI Payments — Bitontree](https://www.bitontree.com/agentic-commerce-ai-agents-payments-ap2-x402)
- [The next generation of MCP — Cloudflare Blog](https://blog.cloudflare.com/mcp-v2/)
- [MCP Servers for Ecommerce: The 2026 Developer's Guide — Your Next Store](https://yournextstore.com/blog/mcp-servers-for-ecommerce)
- [MCP Elicitation: Human-in-the-Loop for MCP Servers — DZone](https://dzone.com/articles/mcp-elicitation-human-in-the-loop-for-mcp-servers)
- [Mastra — TypeScript AI Framework for Agents and Apps](https://mastra.ai/)
- [Mastra Server Adapters (Hono) — GitHub](https://github.com/mastra-ai/mastra/blob/main/server-adapters/hono/src/index.ts)
- [Introducing Server Adapters — Mastra Blog](https://mastra.ai/blog/mastra-server-adapters)
- [Hono | Frameworks — Mastra Docs](https://mastra.ai/guides/getting-started/hono)
- [Reference: MCPServer — Mastra Docs](https://mastra.ai/reference/tools/mcp-server)
- [Server Adapters — Mastra Docs](https://mastra.ai/docs/server/server-adapters)
- [MCP Server Economics — TCO Analysis, Business Models & ROI — Zeo](https://zeo.org/resources/blog/mcp-server-economics-tco-analysis-business-models-roi)
