# Session Summary: Agent Commerce Research + Model-Agnostic Harness Research

**Purpose of this doc:** a comprehensive handoff for another agent/session picking up this work. Covers two separate research tracks run in this session, what was found, what was decided, what's still open, and where everything lives.

**Repo:** `cyma` (octio.co.za monorepo). All research docs are markdown files under `docs/research/`, on git branches, none merged to `main` yet.

---

## Track A — Agent Commerce Research (4 streams, orchestrated in parallel)

**Goal:** decide whether Octio should build anything around AI agents interacting with e-commerce/services sites, and specifically whether an "agent payment gateway" product is worth pursuing.

Run via `domain-orchestrator`: three independent research streams fanned out in parallel worktrees, then a fourth synthesis stream after all three landed. Each stream used `bmad-deep-recon` methodology (cited, decision-grade, no fabrication) — though `_bmad/` scaffolding wasn't installed in this repo, so workers ran research via direct web fan-out instead of the full BMAD script pipeline.

### A1 — MCP as interop
**File:** `docs/research/mcp-interop.md` · **Branch:** `worktree-agent-a92e17a01af7653bc` · commit `c19f3a1`

- MCP has won as the agent-to-tool interop standard (donated to the Linux Foundation's Agentic AI Foundation; native support across Anthropic/OpenAI/Google/Microsoft).
- But the *implementation* layer is largely demo-ware: most public MCP servers ship with no auth (41%), many are SSRF-vulnerable (36.7%), 30+ CVEs surfaced in early 2026.
- A2A (agent-to-agent protocol) is a separate layer, not relevant to Octio's single-agent setup.
- Plain browser automation (Operator-style agents) can already reach octio.co.za today with zero integration work — MCP isn't required for an agent to interact with the site at all.
- Octio's stack is well-positioned: **Mastra ships a first-class `MCPServer` class with a Hono adapter** — bolting MCP onto the existing Hono worker is a config/wiring job, not a from-scratch build, because the chosen framework already anticipates it.
- Recommended shape if pursued: narrow read-only tools first (search/detail/availability), OAuth 2.1 via a managed provider (not hand-rolled), prefer exposing the existing guarded chat agent over raw CRUD tools for anything write-capable (bookings) to avoid bypassing the phase-routing/hallucination-guard work already built into the chat agent.
- **Business case is unproven** — no sourced evidence of agent-mediated booking revenue for comparable SMBs. This is the open question the whole track hinges on.
- **Spin-off (queued to fleet inbox):** audit worker access logs for existing bot/agent user-agents (OpenAI Operator, ChatGPT-user, Claude, GPTBot, Perplexity) hitting octio.co.za today, to get a real traffic baseline before betting on this as an acquisition channel.

### A2 — SA agent-to-agent payments
**File:** `docs/research/sa-agent-payments.md` · **Branch:** `worktree-agent-af42d632d319d8d90` · commit `eef67e4`

- South Africa is **not** part of the emerging global agentic-payment rails in any operational sense. SARB and PASA have published nothing addressing AI agents making payments.
- Every purpose-built agentic protocol (Stripe ACP, Mastercard Agent Pay/AP4M, Google AP2) either explicitly excludes SA or has no local rollout — the one exception is **Visa's April 2026 "Intelligent Commerce Connect" launch, which does name South Africa.**
- The underlying rails an agent-payment product would actually need — tokenization, MIT-style recurring-charge flows that skip interactive 3DS, Capitec/Stitch Variable Recurring Payments (VRP), PayShap — **already exist in SA today** and could support a scoped, spending-capped agent-purchasing pilot without waiting on SARB or a card-scheme protocol.
- **The gap is regulatory clarity and agent-protocol participation, not missing infrastructure.**
- **Spin-off (queued):** follow-up recon/build-spike to confirm a scoped, spending-capped agent-purchasing flow is buildable today purely on Peach/Stitch/Capitec VRP rails, without waiting on SARB or a card-scheme agent protocol.

### A3 — Agent payment gateway feasibility (adversarial)
**File:** `docs/research/agent-payment-gateway-feasibility.md` · **Branch:** `worktree-agent-a1693520efc23ee50` · commit `9ace733`

**Explicit verdict: do not build a general-purpose agent payment gateway.** Already cornered by the card networks and Stripe at the protocol/authorization layer:
- Visa (Trusted Agent Protocol), Mastercard (Agent Pay / Agent Pay for Machines), Stripe (Agentic Commerce Protocol, with OpenAI/Meta), Google (AP2) are all live in 2026 with named merchants and processors — not white papers. A startup can't out-race incumbents who already own the issuer/acquirer relationships that make this a network primitive, not an app-layer feature.
- The one genuinely open, sourced gap: **liability allocation for agent-initiated disputes.** Even Google's AP2 admits its cryptographic "Mandates" don't resolve who's liable when an agent errs; no network has published binding agent-specific chargeback rules. The UK FCA already flags agentic AI as "breaking" its consent model. This gap gets closed by network operating-committee rules and regulators, not by a venture-funded API layered on top of protocols it doesn't control.
- KYC/AML is de facto settled (the human/entity funding the agent is always the KYC'd party) but not formally codified.
- The one narrow thread worth a second look: **non-card-rail plays** — specifically **x402** (Coinbase/Anthropic-backed stablecoin agent-payment protocol), which shows real usage: 69k agents, 165M transactions by April 2026. More open than the card-network lane, not explored in depth here.
- **Confidence caveat:** most sources were secondary/tertiary aggregators rather than fully-fetched primary pages — re-verify dates/specifics against Stripe/Visa/Mastercard/Google primary sources before this justifies a funding decision.
- **Spin-off (queued):** dedicated comparison of the x402/stablecoin lane vs. the card-network lane for agent-to-agent micropayments specifically.

### A4 — Position paper (synthesis)
**File:** `docs/research/position-paper-agent-ready-ecommerce.md` · **Branch:** `worktree-agent-a9be570e4c77bb08b` · commit `b3eb215`

**Core recommendation:** build a **read-only MCP surface** (search/service-detail/availability) on Octio's existing Mastra+Hono stack. Cheap, uses infra already paid for, taps a standard that's already won the interop argument.

**Do not build agent payment infrastructure of any kind** — per A3's verdict, already cornered by Visa/Mastercard/Stripe/Google AP2. The SA-specific spending-capped VRP pilot from A2 is real and buildable, but should be **deferred to phase 2**, gated on proven agent-mediated booking demand (the business-case gap A1 flagged), since SARB/PASA are silent and liability defaults to the human principal are untested.

**Bottom line across all four reports: skip payments, do the cheap MCP-exposure play first, prove demand before building anything payment-shaped.**

### Fleet inbox proposals queued (Track A)
Three items proposed via `fleet propose 'Research' ...` — not dispatched, awaiting human review via `/dispatch`:
1. Audit worker access logs for existing agent/bot user-agents hitting octio.co.za.
2. Follow-up recon: spending-capped agent-purchasing pilot on SA VRP/PayShap rails.
3. x402/stablecoin lane vs. card-network lane comparison for agent-to-agent micropayments.

---

## Track B — Model-Agnostic Multi-Agent Harness Research

**Goal:** a separate, unrelated architecture question — should Octio build a model-agnostic ecosystem (tmux sessions driving a harness, spinning up subagents like this session's own infra does) that can swap between self-hosted models (DeepSeek), Claude, and OpenAI's latest model as the landscape shifts, POC'd cheaply before a client rollout.

**Files:**
- `docs/research/model-agnostic-harness-overview.md` — main research report
- `docs/research/artifact-model-agnostic-harness.html` — published as a Claude Artifact for visual reading: **https://claude.ai/code/artifact/2af75490-e37e-4cb0-93b6-0adb756e6856** (private — share from the artifact's own share menu if needed)
- `docs/research/subscription-to-api-migration-plan.md` — phased auth migration plan
- **Branch:** `worktree-research-harness-overview` · commits `38eb357`, `e76ac33`, `b3ecd51`

### B1 — DeepSeek Harness (`dsh`)
Real, active, developer preview. [github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness). "Everything is a plugin" architecture on **Cordis** — no privileged core, model adapters/tools/sessions/loops/UI are all plugins. CLI + local Web UI (`npx @deepseek-ai/dsh web`).

**Confirmed (follow-up verification):** model adapters are genuinely swappable, not theoretical:
- Built-in provider catalog includes **OpenAI, Anthropic, Bedrock, Azure, Vertex** — added via Settings → Models with just an API key.
- A **custom provider** mechanism exists for anything else (self-hosted models, gateways): provider ID, base URL, API protocol (`openai-completions` / `openai-responses` / `anthropic-messages`), credential, model list.
- This is the same shape as the LiteLLM/OpenRouter gateway pattern (see B3) — `dsh` speaks it natively, so a separate gateway layer is optional polish, not a requirement.
- Model swap is a Settings change, not a code change — matches the architecture doc's own framing: "one provider swap changes the whole product."
- Caveat: still developer-preview, breaking changes expected — fine to prototype on, not yet safe to build client-facing production infra on.

### B2 — "Astra" disambiguated
Two unrelated real things share this name:
- **OpenAI's GPT-6 Astra** — real, shipped Sept 3–4, 2026. Rolling out across ChatGPT plans plus the **OpenAI API** and AWS. OpenAI's largest training run to date. This is the one relevant to the harness (API-accessible).
- **Google DeepMind's Project Astra** — separate, older, still a closed research prototype feeding into Gemini Live, no public API/GA timeline. Not the same thing, not currently pluggable.
- GPT-6 Astra is trained for stronger agentic autonomy: `goal → plan → multi-step execution → result`, tolerates ambiguous instructions by proceeding on reasonable assumptions rather than stopping to ask, holds its main goal across long sessions. Inside the Codex harness specifically it keeps its own searchable notes across context windows (rather than relying on the harness to compact/summarize), reported ~1.9x faster task completion and ~70% better token efficiency vs. the prior model on long-horizon tasks.
- **Important clarification surfaced in conversation:** this autonomy difference is a **model training/product-behavior difference, not a different architectural topology.** In every harness (Claude Code, Codex, `dsh`), the split is identical: **the model decides which tool to call next; the harness executes the call, manages context/compaction, and enforces sandboxing/approvals.** Codex is not "doing the heavy lifting instead of the model" — Codex *is* the harness, same relationship as Claude Code↔Opus/Sonnet or `dsh`↔DeepSeek's model. What differs per-model is how much ambiguity/planning it can be trusted with before you need to write an explicit spec — a prompting/tuning decision the harness can make per-model, not something baked into the plumbing.

### B3 — Architecture verdict
- **Model-swapping is a solved layer, separate from orchestration:** LiteLLM (self-hosted proxy, 140+ providers, OpenAI-compatible) or OpenRouter (hosted equivalent) — though as B1 confirms, `dsh`'s own custom-provider mechanism already covers this natively, making a separate gateway optional rather than required.
- **tmux-based multi-agent orchestration is already well-established, not novel:** `awslabs/cli-agent-orchestrator` (AWS-authored, explicitly multi-CLI: Claude Code, Kiro, Codex, coordinated in isolated tmux sessions) is the closest existing prior art to what was proposed. Several peer projects exist (`tmux-orchestrator`, `claude_code_agent_farm`, etc.).
- **Plain verdict:** the architecture is sound and not novel-risk — compose existing solved layers (model-swap + tmux orchestration), don't rebuild them. DeepSeek Harness proves the right shape but is pre-1.0. GPT-6 Astra is real and reachable via API.
- **The actual risk is contractual/billing, not technical** (see B4).

### B4 — Auth/billing boundary (decided, not just researched)
- **Anthropic's Agent SDK technically blocks OAuth/subscription tokens** — API keys are mandatory at the SDK level, not just a ToS ask. Consumer Terms exempt *personal, interactive* Claude Code CLI use on your own machine; that exemption does not extend to automated or client-facing use.
- **Decision made this session:** subscription-backed access (Claude Pro/Max, ChatGPT) is acceptable **only** for manual, human-interactive testing during the current exploratory phase. **No gateway/proxy will be built that fronts a subscription session as a programmatic API** for `dsh` or tmux orchestration to call — even for testing-only use, on the reasoning that this is a bypass mechanism, not a config choice, and doesn't get safer at small scale. This was explicitly declined as something to build, even after the user confirmed testing-only intent.
- **Recommended alternative for automated testing right now:** cheap pay-as-you-go API keys (Anthropic + OpenAI) wired directly into `dsh`'s built-in provider slots — minimal extra setup, removes the risk entirely, and is the exact same rig production will use.
- **Migration plan** (`docs/research/subscription-to-api-migration-plan.md`) lays out phased triggers:
  - **Phase 0 (now):** manual/interactive testing on subscriptions OK; any automated run should already use API keys.
  - **Phase 1 trigger — first automated/unattended run:** API keys mandatory, resolve open ToS questions before this phase.
  - **Phase 2 trigger — first client-visible/demo environment:** API-key only, no exceptions; re-check `dsh`'s stability; decide if LiteLLM/OpenRouter is warranted yet.
  - **Phase 3 trigger — production rollout to paying clients:** full Commercial Terms review, per-client cost attribution, re-verify Astra pricing against live docs.
- **This decision is saved to persistent memory** (`harness_subscription_auth_boundary.md` in this session's memory store) so it carries into future sessions automatically.

### Open items carried forward (Track B)
- Exact GPT-6 Astra API model string, pricing, rate limits — not confirmed, only launch-week coverage.
- OpenAI's current consumer ToS wording on automated/business use — not independently re-verified (Anthropic's was).
- Whether `dsh`'s custom-provider mechanism is scriptable/config-file-driven for CI-style automated testing, vs. only settable through the Web UI — confirmed the mechanism exists, not confirmed it's headlessly automatable yet.

---

## Everything a picking-up agent needs to know at a glance

1. **Two unrelated tracks ran in this session** — agent-commerce/payments research for Octio's product (Track A), and harness architecture research for internal tooling (Track B). Don't conflate them.
2. **Track A verdict:** build the cheap MCP read-only surface, skip payments entirely for now, prove agent-driven booking demand before revisiting SA VRP pilot or any payment infra.
3. **Track B verdict:** the tmux+swappable-model harness idea is architecturally sound and largely a composition of existing tools (`dsh`'s native provider system already does the model-swap job). The blocker isn't technical — it's that subscription auth cannot legitimately back automated use, and the team has committed to API-key auth for anything beyond manual personal testing, with a phased plan for when to enforce that harder.
4. **Nothing here is merged to `main`.** Every research doc lives on its own branch (listed above per file). A human needs to review and merge deliberately.
5. **Three spin-off research ideas are sitting in the fleet inbox**, unactioned, awaiting `/dispatch`.
