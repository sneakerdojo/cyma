---
title: Verification status (research log)
description: What's verified, what's disputed, what's stale — with sources and dates. The audit trail for every claim in this document.
---

> **Last refreshed:** 2026-05-12. Re-run quarterly. The discipline: every numeric or factual claim earns a row here with VERDICT (verified / corrected / disputed / inconclusive) + source + date.

## Verdict legend

| Verdict | Meaning |
|---|---|
| ✅ Verified | Claim matches authoritative source, date current within 6 months |
| ✏️ Corrected | Original claim was wrong/stale; this row records the correction |
| ⚠️ Disputed | Sources disagree; we picked one and noted the trade-off |
| 🔍 Inconclusive | No authoritative source found; flagged for re-research or bottom-up rebuild |

---

## Market data (chapter 02)

| Claim | Verdict | Correction / Source |
|---|---|---|
| "~2.5M SMMEs in SA" | ✏️ Corrected | Use: "~2.5M+ micro-enterprises (72% informal) / ~3M total MSMEs / ~250k formal SMMEs." Source: [FinScope MSME 2024 (FinMark)](https://finmark.org.za/knowledge-hub/articles/finscope-msme-south-africa-2024-key-findings-highlight-urgent-need-for-informal-sector-support) + [Small Business Institute baseline](https://www.smallbusinessinstitute.co.za/) |
| SMMEs ~34% of SA GDP | ✅ Verified | [SARS SMME Connect #13, Feb 2026](https://www.sars.gov.za/businesses-and-employers/small-businesses-taxpayers/smme-connect-13-february-2026-edition/). NDP 2030 aspiration is 60–80%. |
| SMMEs ~60% of employment | ✅ Verified | SARS SMME Connect #13. Note: FinScope 2024 uses 80% on a broader "workforce" definition — pick one source, cite consistently. |
| "76% of small businesses globally use/explore AI in 2026, up from 40% in 2025" | ✏️ Corrected | **WRONG.** Closest correct facts: 82% of US SMBs have invested in AI tools (SBE Council Tech Use Survey, Mar 2026); US Chamber confirms gen-AI usage rose 40% (2024) → 58% (2025). Replace with one of those. |
| Statista projects SA AI market into "billions in spend" | ✏️ Corrected | Specific: US$537.31M in 2025, ~35% CAGR to US$3.27B by 2031. Source: [Statista](https://www.statista.com/outlook/tmo/artificial-intelligence/south-africa) |
| SAM ~250,000 SA service businesses with website + phone funnel | 🔍 Inconclusive | No authoritative SA-specific survey. Current number matches SBI's count of ALL formal SMMEs, not service-only. Action: bottom-up rebuild from SARS SIC codes × Xero 2025 invoicing-online % (45%). |
| Junior marketer cost R15k–R25k/mo | ✏️ Corrected | Indeed Jan 2026: average junior marketer R11,241/mo base. Range R12,500–R20,800. Add ~25–30% UIF/COIDA/skills levy/medical = R14,500–R27,000 gross-loaded. Admin assistant R8k–R15k base. |
| SA marketing agency retainer R5,000–R15,000/mo | ✏️ Corrected | R5k–R15k is SOCIAL-ONLY band. Full digital retainer 2026: R15,000–R30,000/mo; up to R100k+ for enterprise. Source: [Syte SA 2026 pricing guide](https://syte.co.za/digital-marketing-agency-costs-in-south-africa-2026-pricing-guide-for-business-owner/) |
| SA web designer R10,000–R30,000 one-off | ✅ Verified | Captures the standard-to-mid band. Full 2026 spectrum: R1.5k–R7k template / R8k–R15k SMB / R15k–R40k mid / R40k+ custom. Source: [Bunnypants 2026 guide](https://www.bunnypants.co.za/how-much-does-web-design-cost-in-south-africa/) |
| ZAR/USD ≈ R16.45 (May 2026) | ✅ Verified | [Trading Economics 11 May 2026](https://tradingeconomics.com/usdzar:cur). Monthly avg R16.40, range R15.68–R16.88. |

### Newly surfaced facts not in original draft

| Fact | Source | Why it matters |
|---|---|---|
| Compulsory VAT threshold raised R1M → R2.3M (Apr 2026 Budget) | [SARS Budget 2026 FAQ](https://www.sars.gov.za/about/sars-tax-and-customs-system/budget/budget-2026-frequently-asked-questions/) | Materially changes who in our SAM is VAT-registered. Most plumbers/dentists now under the threshold. |
| Turnover Tax: covers up to R2.3M, first R600k tax-free, capped 3% | SARS Budget 2026 | Strong tax tailwind for our exact ICP. Competitive angle: "your AI subscription is a deductible business expense." |
| SARS e-invoicing pilots begin 2026, mandatory phases 2026–2029 | [KPMG SA e-invoicing](https://kpmg.com/us/en/taxnewsflash/news/2026/02/south-africa-tax-authority-confirms-multi-year-e-invoicing-digital-reporting-reform.html) | Future product hook: integrate AI agents with SARS e-invoicing for our SMB customers. |
| POPIA: mandatory breach-notification portal from 1 Apr 2025; Regulator's 2025/26 APP shifted to proactive industry sweeps | [Werksmans](https://werksmans.com/south-africas-information-regulator-what-the-2025-26-annual-performance-plan-means-for-business-as-presented-to-the-portfolio-committee-on-5-may-2026/) | Compliance risk is real, not theoretical. Fines becoming actual. |
| POPIA "registration" = registering an Information Officer (not the business) via eServices | [Michalsons](https://www.michalsons.com/blog/faq-items/how-do-i-register-my-information-officer-with-the-regulator) | Correct the operational plan wording. |
| Payment-rail standard for SA SMBs: Yoco (2.55–2.95% local + 24h payout), PayFast, Stitch | [Sashares 2026 gateways](https://sashares.co.za/payment-gateways/) | Add to operational plan. Stripe is workable but not the SA default. |
| SA online sales projected R225B in 2026 (38% YoY) | Industry estimate | Supports SAM-sizing tailwind. |

---

## API / model pricing (chapter 02, 09, model-routing appendix)

| Claim | Verdict | Correction / Source |
|---|---|---|
| Claude Sonnet ~$3/1M tokens | ✏️ Corrected | $3 in / **$15 out** per 1M (output 5× input). Use Sonnet 4.6 (no 4.7 exists for Sonnet). |
| Claude Opus 4.7 exists | ✅ Verified | Released 16 Apr 2026. $5 in / $25 out per 1M. New tokenizer adds ~35% effective cost. Source: [Anthropic news](https://www.anthropic.com/news/claude-opus-4-7) + [Finout tokenizer analysis](https://www.finout.io/blog/claude-opus-4.7-pricing-the-real-cost-story-behind-the-unchanged-price-tag) |
| Claude Haiku 4.5 | ✅ Verified | $1 in / $5 out per 1M. Source: [Anthropic news](https://www.anthropic.com/news/claude-haiku-4-5) |
| Kimi K2 Turbo ~$0.50/1M | ✏️ Corrected | Actually **$1.15 in / $8 out per 1M**. Use Kimi K2 base ($0.60/$2.50) if targeting <$1 input price. Source: [Moonshot pricing](https://platform.kimi.ai/docs/pricing/chat) |
| Deepgram Nova-2 $0.0043/min | ✏️ Corrected | Nova-2 deprecated. **Nova-3** is current: $0.0077/min PAYG or $0.0065/min Growth tier. Source: [Deepgram pricing](https://deepgram.com/pricing) |
| Twilio Voice SA $0.013/min | ✏️ Corrected | Actually **$0.010/min** + $1.50–4.00/month per number. Source: [Twilio SA voice pricing](https://www.twilio.com/en-us/voice/pricing/za) |
| ElevenLabs Flash ~$0.30/1k chars | ✏️ Corrected | API direct is **$0.05/1k chars**. The $0.30 figure was sub-tier overage. Source: [ElevenLabs API pricing](https://elevenlabs.io/pricing/api) |
| Gemini 2.5 Flash | ✅ Verified | $0.30 in / $2.50 out per 1M. Source: [Google Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 2.5 Pro | ✅ Verified | $1.25 in / $10 out (≤200k context) per 1M. Source: same. |
| Llama 3.3 70B on Groq | ✅ Verified | $0.59 in / $0.79 out per 1M at **250+ tok/s** — best fit for sub-1s voice. Source: [Groq pricing](https://groq.com/pricing) |
| Gemma 3 27B via Together/Fireworks | ✅ Verified | ~$0.08 in / $0.16 out per 1M. Source: [PricePerToken](https://pricepertoken.com/pricing-page/model/google-gemma-3-27b-it) |
| OpenAI GPT-4o-mini | ✅ Verified | $0.15 in / $0.60 out per 1M. Cheap classifier-grade fallback. |

---

## Competitor data (chapter 03)

| Claim | Verdict | Correction / Source |
|---|---|---|
| HighLevel "$97–$497/month per location" | ✅ Verified | $97 Starter (3 sub-accts) / $297 Unlimited (SaaS-resell capable) / $497 Pro/Agency. Source: [gohighlevel.com/pricing](https://www.gohighlevel.com/pricing) |
| Adam Erhart $2k + $297/mo model still active | ✅ Verified | Erhart now serves as HighLevel Director of BizDev. Same playbook. Source: [HighLevel Adam Erhart page](https://www.gohighlevel.com/adam-erhart-pro) |
| ManyChat as low-cost chatbot competitor | ✏️ Corrected | Essential $14 / Pro $15+ / Business $69. **AI add-on $29/mo extra** on Pro/Business. Free tier reduced to 25 contacts (Mar 2026). |
| Drift $2,500/mo+ | ✅ Verified | Enterprise positioning; not an SMB threat. |
| Intercom — listed only as adjacent | ✏️ Corrected | Intercom's **Fin AI Agent** is at $0.99/resolution (or $0.59/resolution at 10k+). **Outcome-priced.** Introduces price-collapse risk for our R/month model. Source: [fin.ai/pricing](https://fin.ai/pricing) |
| Motion as CEO PA competitor | ✏️ Corrected | $19/mo Pro AI ($12.73 annual) / $29/mo Business. Expanded to "AI Super App" (docs/sheets/chat) in 2026. Threatens CEO PA at a productivity-suite price point. |
| Reclaim.ai pricing | ✅ Verified | Free / $8 / $12 / $18 per user/mo. Source: [reclaim.ai/pricing](https://reclaim.ai/pricing) |
| Superhuman as PA competitor | ✏️ Added | $25–$40/mo. Has Auto-Send feature that markets itself as an EA replacement. Direct overlap with CEO PA email-handling. Source: [superhuman.com/plans](https://superhuman.com/plans) |
| Mem.ai pricing | ✅ Verified | Free (25 notes/mo) / $12 Pro / $15 Teams |
| **Lindy AI — closest direct competitor — MISSED in original draft** | ✏️ Added | $0/400cr free / $49.99/mo Pro / $299.99/mo Business + $0.19/min voice. VC-backed US agent builder. **Highest 12-month entry threat.** Source: [lindy.ai/pricing](https://www.lindy.ai/pricing) |
| Cognosys/Ottogrid | ✏️ Added (then deprecated) | **Acquired by Cohere May 2025.** Less direct threat now, but signal: AI-agent space consolidating into foundation-model owners. |
| Synthflow voice agent | ✏️ Added | $0.09/min + LLM ($0.02–0.04/min). Has reseller tier — local SA agencies can sell voice agents at markup. |
| Bland AI voice | ✏️ Added | $0.11–$0.14/min (raised from $0.09 flat in Dec 2025). |
| Vapi (developer-oriented voice infra) | ✏️ Added | $0.15–0.33/min all-in. Option: Octio could BUILD ON Vapi rather than compete. |
| Air AI | ✏️ Added | $25k–$100k upfront — Fortune 500 positioning; not an SMB threat. |
| Twilio AI Assistants | ✏️ Added | $0.07/min in Dev Preview. **When this goes GA, every Twilio partner becomes a potential voice-agent competitor.** Watch this closely. |
| Buffer | ✏️ Added | Free up to 3 channels with **AI Assistant free on all tiers**. Beats Octio's Social Manager R4,500/mo for very small accounts. |
| Beehiiv | ✏️ Added | Free up to 2,500 subs / $43–$109/mo Scale-Max. **Hard to beat on newsletter for solo creators.** Octio's value-add must be: operator service + brand voice tuning, not raw newsletter tooling. |
| Mailchimp prices rose 11–13% Apr 2026 | ✏️ Added | Tailwind for our newsletter positioning. |
| Substack 10% rev-share model | ✏️ Added | Structural threat for paid-newsletter use cases. Zero CAC objection. |

---

## Tech / compliance (chapter 06, 11, operational plan)

| Claim | Verdict | Correction / Source |
|---|---|---|
| Mastra v1.0 (Jan 2026) | ✅ Verified | Released Jan 2026, YC W25, $13M funded, 22k+ stars, 300k+ weekly npm downloads, supports AI SDK v6 + Hono adapter. Production-ready. Source: [Mastra changelog 2026-01-20](https://mastra.ai/blog/changelog-2026-01-20) |
| LinkedIn Community Management API: `w_member_social` scope, `/rest/posts` endpoint | ✅ Verified for personal-profile posting | But: API is restricted to registered legal organisations (commercial use); **Standard tier requires manual review with screen-recording demo**. Development tier auto-grants at 500 req/app / 100 req/member. Allow 2–4 weeks for Standard. Source: [LinkedIn Increasing Access](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access?view=li-lms-2025-11) |
| RFC 8058 one-click unsubscribe required for Gmail | ✅ Verified, ⚠️ more severe than originally framed | Required for >5,000/day to personal accounts: List-Unsubscribe + List-Unsubscribe-Post headers + visible body link. SPF+DKIM+DMARC required. Unsub honoured within 48h. **NEW: Nov 2025 Google escalated to PERMANENT REJECTIONS** (not delays). Workspace 2,000/day verified (rolling 24h, per-recipient counting). |
| TikTok Content Posting API approval 5–10 days | ✅ Verified | Now supports **video AND photo**. Unaudited clients restricted to private visibility until audit passes. ~15 posts/day/creator cap. Requires `video.publish` scope. |
| POPIA name + Information Regulator | ✅ Verified | But term is **"Information Officer"** (not "POPIA Officer"); register via Regulator's eServices Portal. **Mandatory online breach-reporting portal from 1 Apr 2025**; 72-hour guideline. April 2025 amendments in force. Source: [Cov Africa](https://www.covafrica.com/2025/04/south-africa-introduces-mandatory-e-portal-reporting-for-data-breaches/) |
| ISO 42001 alignment as Phase 4 goal | ✏️ Corrected | Published 18 Dec 2023. SA adoption nascent (FSS was first payments firm, Jan 2026). **NOT worth pursuing for early-stage SMB seller** — high cost, low buyer demand. Revisit when chasing enterprise/regulated buyers. |
| Twilio SA `+27 12 …` inbound number for WhatsApp | ✏️ Corrected | SA local geographic numbers (+27 11 / +27 21) provisionable for VOICE — verified. **Critical: local +27 geographic numbers are NOT WhatsApp-eligible; need mobile number.** Also: **Meta Cloud API direct is 30–60% cheaper than WhatsApp-via-Twilio.** Recommendation: use Twilio for voice; use Meta Cloud API direct for WhatsApp. |
| ElevenLabs Flash multi-language (af, zu, xh, st) | ✏️ Corrected | Flash v2.5 supports 32 languages including **Afrikaans**. **Zulu, Xhosa, Sesotho NOT supported.** For Nguni languages, alternatives: **Lelapa AI Inkuba**, Meta MMS, Google Chirp. This re-shapes the Voice & Chat Enterprise tier; "multi-language SA" is partial-truth without a Nguni provider in stack. |
| Deepgram Nova-3 for SA accents | ⚠️ Disputed | Works (Elerian AI SA case study confirms) but ASR research shows 10%+ WER degradation on African-accented English. **Speechmatics is stronger** (45% error reduction on African-American voices, explicit accent-robustness investment). Test both for SA market; consider Speechmatics as primary if quality wins material deals. |
| Stripe SA available for billing | ✏️ Corrected | **STRIPE IS STILL NOT AVAILABLE IN SOUTH AFRICA AS OF MAY 2026.** Not on supported-countries list. SA Reserve Bank exchange controls require ZAR-only domestic settlement. **Use Payfast or Peach Payments as primary; Stitch for Instant EFT; Yoco for card present.** Source: [Stripe global](https://stripe.com/global) |
| Discord MessageContent intent manual verification | ✏️ Corrected | Manual verification **only triggered at 75+ servers** (required at 100+). Under 75 servers: just toggle the intent in Developer Portal — no Discord approval needed. Our Patient Zero use is 1 server, so no review needed. |
| Firecrawl for source scraping | ✅ Verified | Active, $83/mo for 100k credits. **Cheaper alternatives:** Jina AI Reader (free 500 RPM, best for unprotected content), Crawl4AI (Apache 2.0 self-host, $50–300/mo compute), Scrapfly (98% on anti-bot but expensive). Switch to Jina for Phase 1a cost-optimisation. |

---

## Frameworks (appendix)

| Claim | Verdict | Notes |
|---|---|---|
| Hormozi $100M Offers (2021) | ✅ Verified | Existence + content. Public domain summaries widely available. |
| Hormozi $100M Leads (2023) | ✅ Verified | Same. |
| Geoffrey Moore Crossing the Chasm (3rd ed 2014) | ✅ Verified | Same. |
| Ash Maurya Running Lean (2010 / 2012) | ✅ Verified | Same. |

---

## How to use this appendix

Three uses:

1. **Sales calls / investor pitches.** If asked "where does this number come from?" — answer with a citation from this appendix, not vibes.
2. **Quarterly refresh.** Every quarter, re-run the verification pass. Numbers move; sources go stale. Update verdicts.
3. **Honesty discipline.** When you can't cite, mark 🔍 Inconclusive rather than padding the case. Builds long-term credibility.

The cost of getting numbers wrong in a business plan is silent until it isn't — an investor or partner spots one wrong number and the credibility of the whole document drops.
