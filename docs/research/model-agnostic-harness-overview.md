# Model-Agnostic Multi-Agent Harness — Overview & Reading Material

**Date:** 2026-09-10
**Type:** Technical research (overview, not a build plan)
**Decision this feeds:** Whether to build a tmux-driven orchestration ecosystem that can swap its underlying model between self-hosted (e.g. DeepSeek), Claude (via API/gateway), and OpenAI's latest model, POC'd on subscriptions and rolled out to clients on metered API tokens.

---

## 1. DeepSeek Harness (`dsh`)

**Confirmed real.** Repo: [github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness). Docs: [deepseek.com/harness/en](https://deepseek.com/harness/en/), architecture doc at `docs/architecture.md` in the repo.

- **What it is:** an "everything-is-a-plugin" agent harness — CLI + local Web UI (`npx @deepseek-ai/dsh web`, serves `http://127.0.0.1:3080`). Built on **Cordis**, a plugin/composability framework (paper: "A Programming Paradigm for Spatiotemporal Composability").
- **Architecture:** no privileged core. Model adapters, tool registries, session logging, agent loops, sandboxes, storage, scheduling, and even the UI are all plugins mounted alongside each other; registrations auto-revoke when a plugin unloads. This is the load-bearing detail for your use case — **model adapters are plugins, not hardcoded** — which is the correct shape for "swap the model without rewriting the harness."
- **Status:** developer preview, explicitly rapid-iteration with breaking changes expected. Not a stable target to build production client infrastructure on yet.
- **Traction:** unusually fast — reporting in the tens-of-thousands to 200k+ star range within days of release (see [Flowtivity's writeup](https://flowtivity.ai/blog/deepseek-harness-open-source-agent-explained/), title itself references "95,000 GitHub Stars in 2 Days"), plus a community plugin index ([0xsline/awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness)) and a `dsh-plugin` GitHub topic already populated.
- **Verdict on viability as *your* orchestration layer:** it's the right shape (plugin-based, model-adapter-swappable, scriptable via CLI not just the Web UI) but it is DeepSeek-branded, pre-1.0, and you'd be building client-facing infrastructure on someone else's fast-moving developer preview with a name that ties you to one vendor's brand even if it's technically model-agnostic underneath. Worth prototyping against, not worth committing production architecture to yet.

## 2. "Astra" — disambiguated

Two real, unrelated things share this name. Confirm which one is actually relevant before designing around it:

- **OpenAI's GPT-6 Astra** — real, shipped. Announced/released September 3–4, 2026: approved users first, general availability the next day, rolling out across ChatGPT Plus/Pro/Business/Enterprise plus the **OpenAI API** and AWS. OpenAI describes it as their largest training run ("first time we've pretrained on more than 100,000 GPUs at our Stargate site in Texas" — VP of Research Aidan Clark) and claims SOTA on computer use, browsing, software engineering, cybersecurity. Sources: [OpenAI](https://openai.com/index/gpt-6-astra/), [Axios](https://www.axios.com/2026/09/03/openai-astra-gpt-6-agi-brockman), [Fortune](https://fortune.com/2026/09/03/openai-debuts-gpt-6-astra-computer-use-greg-brockman-says-start-of-agi/), [CNBC](https://www.cnbc.com/2026/09/03/open-ai-astra-gpt-6-cyber.html), [Al Jazeera](https://www.aljazeera.com/economy/2026/9/4/openai-unveils-gpt-6-astra-amid-rising-scrutiny-and-safety). This is almost certainly what you meant and is the relevant one for a "latest and greatest OpenAI model" slot in your harness. It's API-accessible, which matters for the architecture question below.
- **Google DeepMind's Project Astra** — separate, pre-existing (introduced ~2024, still evolving). As of the search date it remains a research prototype for select testers, feeding capabilities into Gemini Live rather than shipping as a standalone product; no public GA timeline. Source: [deepmind.google/models/project-astra](https://deepmind.google/models/project-astra/). Not the same thing, not currently API-swappable into a harness the way GPT-6 Astra is.
- One source flags this confusion is common enough to have its own explainer: [codersera.com — "GPT Astra vs Google Project Astra: Not the Same Thing"](https://codersera.com/blog/gpt-astra-vs-google-project-astra-2026/).

**Note on freshness:** this is a days-old announcement at time of writing (2026-09-10 vs. 2026-09-03/04 launch). Pricing, exact API model ID, and rate limits should be re-checked against OpenAI's platform docs before any integration work — none of the search results above confirm the API model string or pricing tier.

## 3. Architecture: is a swappable-model, tmux-driven harness sound?

### Prior art for the model-abstraction layer

You don't need to build model-swapping into the harness itself — this is a solved layer, separate from orchestration:

- **LiteLLM** — open-source proxy/SDK, translates 140+ providers into one OpenAI-compatible interface, self-hostable, supports GitOps-style policy-as-code and monitoring. This is the closest match to what you're calling "Claude gateway" if you mean *a provider-agnostic proxy in front of multiple model backends* rather than something Anthropic-specific. [litellm.ai](https://www.litellm.ai/), [docs.litellm.ai](https://docs.litellm.ai/docs/tutorials/openai_agents_sdk)
- **OpenRouter** — hosted equivalent, unified API/marketplace routing to dozens of providers with fallback and consolidated billing, no self-hosting required. [openrouter.ai/blog/insights/llm-gateway](https://openrouter.ai/blog/insights/llm-gateway/)
- The pattern generally: an **agent router** sits between the coding agent and the providers, directing each request to a model by task/cost/capability rules — this is middleware, decoupled from whichever CLI/tmux orchestration sits on top. [coderouter.io](https://www.coderouter.io/blog/agent-router-alternative-guide-2026)

**Implication for your design:** put the swap point at the LiteLLM/OpenRouter layer, not inside DeepSeek Harness's plugin system or bespoke tmux glue. That gives you self-hosted (DeepSeek or other open-weight), Claude, and OpenAI all behind one interface with provider swap being a config change, and it's a layer that already exists and is maintained by someone other than you.

### Prior art for the tmux orchestration layer

This pattern is already well-established, not something you'd be pioneering:

- [twaldin/tmux-orchestrator](https://github.com/hesreallyhim/awesome-claude-code/issues/1279) — spawns Claude Code agents in isolated tmux windows, each with its own context and git worktree, two-way messaging between sessions.
- [awslabs/cli-agent-orchestrator](https://github.com/awslabs/cli-agent-orchestrator) — AWS-authored, explicitly multi-CLI (Claude Code, Kiro, Codex, and more) coordinated in isolated tmux sessions — i.e. someone at AWS has already built the "swap between agent CLIs" pattern you're describing, one layer up from model-swapping.
- [Dicklesworthstone/claude_code_agent_farm](https://github.com/Dicklesworthstone/claude_code_agent_farm) — 20+ parallel Claude Code agents, lock-based coordination, tmux monitoring.
- Several more of the same shape ([absmartly/Tmux-Orchestrator](https://github.com/absmartly/Tmux-Orchestrator), [primeline-ai/claude-tmux-orchestration](https://github.com/primeline-ai/claude-tmux-orchestration)), plus a curated list at [andyrewlee/awesome-agent-orchestrators](https://github.com/andyrewlee/awesome-agent-orchestrators).

**Implication:** the tmux+subagent pattern this session's own infra already uses (worktree isolation, one agent per branch, fan-out/collect) is directionally the same shape as `cli-agent-orchestrator` — the novel part of your idea isn't tmux orchestration itself, it's specifically **coupling that orchestration to a swappable model layer underneath**, which is the LiteLLM/OpenRouter piece above, not a tmux concern at all.

### The billing plan — this is the actual risk

You proposed: POC on subscriptions, switch to API tokens at client rollout. This has a documented, hard boundary, not a gray area:

- Anthropic's **Consumer Terms** (Free/Pro/Max) explicitly carve out an exception for Claude Code CLI run on your own machine, but that exception does not extend to production, always-on, or business/client-facing automation — for that, **API keys under Commercial Terms are required**, and Anthropic's own Agent SDK now technically enforces this: **OAuth tokens from Free/Pro/Max accounts cannot be used with the Agent SDK at all** — API key auth is mandatory. Sources: [Anthropic — Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance), [autonomee.ai explainer](https://autonomee.ai/blog/claude-code-terms-of-service-explained/).
- This means "POC on subscription, ship to clients on subscription-while-we-wait" is not just against the spirit of the ToS — for Anthropic specifically it's **technically blocked** in anything built on the Agent SDK, and contractually out of scope for anything client-facing regardless of SDK.
- Treat this as the default assumption for OpenAI and any other provider too: consumer ChatGPT Plus/Pro terms are consumer-use terms, not licenses for third-party client automation, though this research did not independently re-verify OpenAI's current wording — do that before designing around it. DeepSeek Harness is open-source/self-hosted so this constraint doesn't apply to that leg at all, which is actually an argument for weighting the self-hosted leg more heavily in a client-facing product, not less.

**Practical read:** budget for API-key billing from day one of anything that will touch a client, even in POC form, for every hosted provider (Claude, OpenAI). Subscriptions are fine for your own internal dev-loop experimentation with the harness, not for anything a client's traffic runs through.

---

## Plain verdict

The architecture is sound and not novel-risk: model-swapping (LiteLLM/OpenRouter) and multi-agent tmux orchestration (cli-agent-orchestrator and peers) are each independently solved, maintained-by-others layers you can compose rather than build. DeepSeek Harness is a legitimate reference implementation of "model as a plugin" but too early (developer preview, breaking changes) to be your production spine — treat it as a thing to watch and maybe borrow patterns from, not a dependency. GPT-6 Astra is real and API-accessible as of Sept 2026, so it's a valid "latest and greatest" slot once you confirm current pricing/model-ID against OpenAI's platform docs directly.

**The biggest actual risk is not technical, it's contractual/billing:** the subscription-to-API bridge you described is explicitly unsupported by Anthropic (Agent SDK enforces API-key auth) and likely unsupported by OpenAI's consumer terms for client-facing use. Design and quote the POC on API-token billing from the start, or the "swap the model" architecture will work fine right up until a client's traffic hits an account that legally/technically can't carry it.

## Suggested reading order

1. [DeepSeek Harness architecture doc](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) — the plugin/Cordis model, to see if it's worth borrowing patterns from.
2. [LiteLLM docs](https://docs.litellm.ai/) and [OpenRouter's gateway explainer](https://openrouter.ai/blog/insights/llm-gateway/) — pick one as the swap layer.
3. [awslabs/cli-agent-orchestrator](https://github.com/awslabs/cli-agent-orchestrator) — closest existing prior art to what you're describing at the orchestration layer.
4. [Anthropic — Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance) — read before writing a line of harness code, not after.
5. [OpenAI's GPT-6 Astra announcement](https://openai.com/index/gpt-6-astra/) — confirm current API pricing/model ID directly, this doc's info is already a week old.

## Open questions not resolved here

- Exact GPT-6 Astra API model string, pricing, and rate limits (not confirmed by the sources gathered — the announcements are consumer/product-launch coverage, not API docs).
- OpenAI's current consumer ToS wording on automated/business use, for direct comparison with Anthropic's — not independently re-verified in this pass.
- Whether DeepSeek Harness's plugin API is stable enough to script headlessly today, versus only through its Web UI — the sources describe the architecture but not a worked headless-scripting example.
