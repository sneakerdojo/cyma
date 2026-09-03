# Agent-to-Agent Purchasing in South Africa: Payment Rails and Gateway Landscape (2026)

**Research type:** Domain recon (native web fan-out, 3 parallel researchers)
**Date:** 2026-09-03
**Decision this serves:** Whether/how an AI agent could execute an autonomous purchase on a user's behalf in South Africa today, and what would have to change for that to work reliably.

**Headline answer:** South Africa is **not part of the emerging global agentic-payment rails** in any operational sense, with one narrow exception (Visa's SA-branded product launch, see §4). No SA gateway, bank, PASA, or SARB has published agent-specific payment infrastructure, rules, or guidance. The technical building blocks that *would* support agent-initiated card-not-present (CNP) payments — tokenization, merchant-initiated-transaction (MIT) flows that skip interactive 3-D Secure, and API-first recurring billing — already exist in the SA market for **subscription/merchant-initiated** use cases, but nothing exists for **open-ended, agent-decided "buy anything" purchases**. SA is behind on agent-specific protocols (Stripe ACP, Mastercard Agent Pay, Google's AP2) and behind on regulatory clarity (no SARB/PASA position on agentic payments at all), but not behind on the underlying rails (tokenization, EFT, 3DS2) that a future agent integration would sit on top of.

---

## 1. SA payment gateways: what exists, what's agent-ready

### 1.1 API and tokenization capability by provider

| Provider | Programmatic CNP API | Tokenization / vaulting | Recurring/subscription API | Agent-specific features |
|---|---|---|---|---|
| **Peach Payments** | Yes — REST API (hosted/embedded checkout, server-to-server payments, payouts, reconciliation) [1] | Yes — explicit checkout tokenization, required before recurring charges [2] | Yes, with a documented flow for skipping 3DS on *subsequent* recurring charges after initial cardholder authentication [3] | None found |
| **Stitch** | Yes — unified API (cards, Capitec Pay, Apple/Google Pay, pay-by-bank, DebiCheck) [4] | Yes; markets token "portability" across processors (unverified independently — vendor claim) [4] | Yes — recurring payments product | None found |
| **Ozow** | Yes — instant EFT + PayShap Request APIs; added FNB/RMB direct bank-API rails in July 2026 requiring no merchant integration [7] | N/A (bank-rail push payments, not card tokens) | Yes, recurring via PayShap Request | None found |
| **Capitec + Stitch (Variable Recurring Payments)** | Bank-API driven — customer authorizes a merchant once with a spending cap; subsequent payments execute automatically, no per-transaction approval [5] | N/A — this is account-to-account, not card | Yes — this is *the* mechanism, launched Dec 2025 | Structurally the closest thing in SA to an "agent-friendly" pull-payment rail — TechCabal calls it one of SA's first large-scale API-driven recurring payment options [5]. **Note: this is bank-direct VRP, not card CNP, and other big-four banks (FNB, Absa, Standard Bank) still rely on traditional DebiCheck**, not this VRP mechanism. |
| **PayFast, Yoco** | Yes (general merchant checkout APIs) | Standard | Standard | None found |
| **PayGate, Adumo, iKhokha, Netcash** | Not independently verified in this pass — comparison-site mentions only, developer docs not directly reached | Unverified | Unverified | None found |

**Conclusion:** SA gateways have the *plumbing* for card-not-present automation (tokenization, server-to-server APIs, MIT-style recurring flows), but every instance found is scoped to **merchant-initiated recurring billing** (a subscription charging a saved card) — not **agent-initiated discretionary purchasing** (an AI agent choosing what/when/how much to buy autonomously, at an arbitrary merchant). No SA gateway publicly discusses "agentic commerce," delegated/scoped payment credentials for AI agents, or an agent checkout API, as of this research (Sept 2026) [8].

### 1.2 3-D Secure as the practical blocker to fully autonomous checkout

PASA mandated 3-D Secure on all online CNP credit card transactions in South Africa effective 28 February 2014, requiring OTP (SMS/email) or a memorized password at card registration [12]. That source is 2014-vintage (3DS1 era); no fresher (2024–2026) primary PASA/SARB document confirming current 3DS2/SCA-equivalent enforcement specifics was found in this pass — flagged as a residual gap.

Under 3DS2, a "frictionless flow" lets low-risk transactions clear without an interactive OTP challenge, based on issuer risk-scoring [13]. This is the mechanism by which an unattended agent transaction *could* clear without a human present. However, a claim surfaced (not fully pinned to a primary source — confidence low-medium) that **South Africa is named among the bottom-performing markets for frictionless 3DS rates**, i.e., SA issuers push a disproportionate share of CNP transactions into interactive OTP challenges relative to global averages, attributed to conservative issuer policy and limited data-sharing between merchants and issuers [14]. If accurate, this is the single most consequential SA-specific finding for this research question: it means SA's card infrastructure is *structurally less agent-friendly* than markets with higher frictionless rates, independent of any agent-specific protocol. This claim should be treated as a lead requiring direct verification (e.g., against a card-scheme frictionless-rate report), not a settled fact.

The one clean, verified SA precedent for CNP-without-live-OTP is Peach Payments' recurring-payments flow, which documents bypassing 3DS on subsequent charges after an initial tokenized/authenticated card — but this is merchant-initiated recurring billing (subscriptions), not open-ended agent purchasing, and the full conditions were not independently verifiable (support article was login-walled) [3]. The standard card-scheme mechanism that any real agent-commerce integration in SA would likely have to use today is the general **Merchant-Initiated Transaction (MIT) exemption** under 3DS2 — a non-agent-specific mechanism that already lets a merchant charge a stored card without cardholder presence. No source found maps MIT explicitly to "agent-initiated" framing in the SA market yet — that mapping is unbuilt.

---

## 2. SARB and PASA: no agentic-payments position exists

This is the clearest finding in the whole research pass: **there is no SARB or PASA publication, sandbox track, discussion paper, or press statement addressing AI agents making autonomous payments/purchases, by name, as of September 2026.** Multiple targeted searches across SARB's Innovation Hub, regulatory sandbox, Payments Ecosystem Modernisation (PEM) programme, and PASA's public site found general AI-in-financial-services material and general payments-modernisation material, but nothing agent-specific [6][16]. This absence is corroborated, not just inferred from a search gap: SA legal/industry commentary explicitly states existing SA law "was not ready for agentic AI" [20][21].

Relevant regulatory context, none of it agent-specific:

- **SARB/FSCA joint report, "Artificial Intelligence in the South African Financial Sector"** (24 Nov 2025, based on a late-2024 industry survey of ~2,100 responses): finds banking/payments institutions lead AI adoption in SA, and recommends principle-based rather than rigid-rule regulation. Secondary coverage (Lexology, Baker McKenzie, Cliffe Dekker Hofmeyr) does not mention agent-initiated payments; the full ~90-page primary PDF was not directly text-searched in this pass (fetch returned unreadable binary) — flagged as the single biggest verification gap in the regulatory dimension [15].
- **Payments Ecosystem Modernisation (PEM) / draft Authorisation Framework**: a third draft, activity-based authorization framework (replacing 2007 Directive No.1 and 2024 Directive No.2 on third-party payment initiation) was open for comment until 15 June 2026, with a final version expected Q3 2026. It opens the National Payment System to non-bank participants, including payment initiators, calibrated by activity/risk. No source states this framework explicitly contemplates AI agents as initiators [17][18].
- **PayShap** (launched March 2023) is a push-payment rail — the recipient's bank controls receipt, unlike a debit-pull model — which structurally reduces (without specifically addressing) one class of agent-initiated-pull risk [19].
- **SARB became 50% co-owner of BankservAfrica** (relaunched as PayInc) in Sept 2025, building toward a Hybrid Unified Payments Platform (H-UPP) that converges payment rails — general infrastructure consolidation, not agent-specific [17].
- **No SA-specific legal framework governs AI-agent payment mandates.** POPIA s71(1) addresses automated decision-making and consent for personal-information processing, but doesn't address agent payment mandates directly. FICA and the National Credit Act don't contemplate non-human transactors. Liability currently defaults to the human principal by default, with no tested framework for disputing an agent-initiated purchase. Nedbank's Ciko Thomas is quoted: "As more autonomous capabilities emerge, the regulatory conversation will evolve, particularly around liability, consent and accountability... this is not a bank-specific issue, but an industry-wide evolution" [20].
- A South African commentary piece explicitly asking "An AI agent spent your money — can anyone prove you authorised it?" (Aug 2026) cites only US frameworks (the AI AGENT Act, NIST, Google's AP2) and **zero South African regulatory references** — confirming, from the domestic commentary itself, that no local framework exists to cite [21].
- SA banks (Absa, others) are deploying agentic AI operationally, but for **customer service** (multilingual support, ~40% of queries resolved without human intervention), not payment initiation — this should not be conflated with payment-agent readiness [22].

---

## 3. Global agentic commerce rails: what's actually live, and where

| Programme | Status as of ~mid-2026 | Backers | Explicit SA/Africa mention |
|---|---|---|---|
| **Stripe + OpenAI — Agentic Commerce Protocol (ACP)** | Live since ~Sept 2025 ("Instant Checkout" in ChatGPT); open standard (Apache 2.0) on GitHub | OpenAI, Stripe (Meta cited as later adopter, not independently confirmed) [9] | **None.** At launch, live only for US users buying from US Etsy sellers, expanding to Shopify merchants. Stripe's Shared Payment Tokens (the mechanism hiding raw card data from the agent) are documented as available only in the **US and Canada** [10][11] |
| **Visa Intelligent Commerce (VIC) / Trusted Agent Protocol (TAP)** | VIC launched ~May 2025 (20+ partners incl. Anthropic, IBM, Microsoft, OpenAI, Perplexity, Samsung, Stripe); TAP launched Oct 2025 (10+ partners incl. Cloudflare), with a chargeback liability shift to Visa for TAP-approved transactions | Visa + major PSPs (Adyen, Stripe, Checkout.com); 100+ ecosystem partners claimed | **Yes — the sole clear exception.** Visa launched "Intelligent Commerce Connect" (~April 2026) explicitly framed as available in South Africa, covering multiple protocols (TAP, ACP, and others, Visa and non-Visa cards), with Visa South Africa's country manager quoted in local press [23][24]. This reads as a merchant-acceptance product (letting SA merchants accept agent-initiated payments), not confirmation that SA issuers/banks are live participants in tokenization or liability-shift schemes the way Singapore or Australia issuers reportedly are. |
| **Mastercard Agent Pay / Agent Pay for Machines (AP4M)** | Agent Pay announced April 2025 (Microsoft, IBM, Braintree); first live agentic transaction claimed March 2026 in Singapore (DBS Bank); AP4M launched June 2026 (30+ companies incl. Coinbase, Stripe, Adyen; agent credentials recorded on Polygon/Solana/Base) | Mastercard + issuers/PSPs, market-by-market rollout with named local "firsts" (Singapore, Australia) | **No operational SA presence found.** A localized Mastercard South Africa marketing page for "Agent Pay" exists, but no SA launch partner, rollout announcement, or "first transaction" story was found — unlike Singapore/Australia/US [25][26] |
| **Google AP2 (Agent Payments Protocol)** | Announced Sept 2025 with 60+ partners (PayPal, Mastercard, Amex, Adyen, Coinbase, Salesforce, Worldpay, JCB, UnionPay, Etsy, and more); donated to the FIDO Alliance for platform-agnostic governance; growing to 100+ endorsers by late 2025 | Google-led; **not** an Anthropic co-development — AP2 is complementary to (interoperable with) Anthropic's Model Context Protocol (MCP), a separate tool/data-access standard, not co-built with Anthropic on payments. This corrects a framing assumption in the original research brief. | **None.** Partner list is global fintech-infrastructure-heavy (PayPal, Adyen, Worldpay, JCB, UnionPay) with no African bank, processor, or regulator named [27][28] |

**Important correction to the original research framing:** the brief described AP2 as a "Google/Anthropic protocol." Based on this research, AP2 is Google-led and interoperates with Anthropic's MCP at a technical level, but Anthropic is not a named commercial backer of AP2 itself. Treat any future planning that assumes an Anthropic-AP2 co-ownership as incorrect.

### Regulatory backdrop in mature markets (for contrast)

- **EU (PSD3)**: expected in the Official Journal late spring/early summer 2026, in force ~18 months later (most SCA deadlines land around late 2027). Preserves EMV 3DS2 as the primary SCA mechanism — no wholesale rollback of authentication rigor for agents. A "commercial agent exemption" from SCA exists and is relevant to AI shopping agents, but the latest draft rolled back earlier proposals to broaden it — its precise scope for AI agents is unresolved even in the EU [29][30].
- **US**: no dedicated federal statute for agentic-payment authorization/liability; card networks are self-regulating via bilateral rules (agent registration/verification, agentic tokens, passkeys, liability-shift extensions) rather than law. American Express has taken a distinct liability stance — committing to cover erroneous purchases made by registered AI agents on its network, an issuer/network-absorbs-risk model, contrasting with Mastercard's issuer-liability-follows-tokenization approach [31][32].

So even the "advanced" markets have not fully resolved agent-authentication regulation — SA's absence of a position is a gap of degree (nothing vs. something), not SA uniquely lagging a settled global consensus.

---

## 4. Is South Africa behind, ahead, or irrelevant?

**Behind, on the specific thing the question asks about — but not uniformly, and not for infrastructure reasons.**

- **Behind on agent-specific protocols and rules.** Every purpose-built agentic-payment mechanism found (Stripe ACP/SPT, Mastercard Agent Pay/AP4M, Google AP2) either explicitly excludes South Africa (Stripe: US/Canada only) or has no SA operational presence (Mastercard: marketing page only, no launch). The one exception — Visa's Intelligent Commerce Connect — is a genuine SA-specific announcement (April 2026), but it is a merchant-acceptance layer, not evidence that SA issuers, PASA, or SARB have built out the trust/liability/tokenization infrastructure those protocols assume elsewhere.
- **Behind on regulatory clarity, categorically.** SARB and PASA have published nothing — not a discussion paper, not a sandbox track, not a circular — that names AI agents or agentic payments. This is a genuine gap, not just an SA-flavored version of a global gap: even the EU (further along on PSD3) hasn't resolved agent-specific SCA exemption scope, but it is *actively legislating* toward an answer, where SA has not started.
- **Not behind on underlying rails.** Tokenization, server-to-server CNP APIs, MIT-style recurring-charge flows that bypass interactive 3DS, PayShap's real-time push-payment infrastructure, and Capitec/Stitch's Variable Recurring Payments (arguably a more elegant unattended-payment primitive, structurally, than a tokenized-card MIT flow) are all live in SA today. An agent-commerce integration built on these primitives — a scoped, spending-capped, pre-authorized recurring mandate rather than an open "buy anything" credential — is technically buildable in SA now, using existing rails, without waiting for SARB or a card-scheme agent protocol.
- **Possibly worse-positioned on the friction side.** The unverified-but-plausible finding that SA has comparatively low 3DS2 "frictionless rates" (i.e., more transactions get pushed to interactive OTP) would, if confirmed, mean SA's card rails are *more* hostile to unattended checkout than global peers — independent of any agent-protocol gap. This needs direct verification before being treated as settled.

**Net read:** South Africa is not "irrelevant" to the emerging rails — Visa has explicitly included it in a 2026 product launch, and the infrastructure (tokenization, PayShap, VRP) exists to build an agent-payment product on. But nothing purpose-built for autonomous agent purchasing exists in SA today, there is zero regulatory guidance to build against, and the one clear entry point (Visa) is a merchant-acceptance announcement rather than proof that SA's issuing/authentication layer is ready. Any near-term "AI agent buys something in South Africa" product would have to be built on general-purpose primitives (tokenized recurring billing, VRP-style spending-capped mandates) rather than on any agent-specific protocol, and would be operating in a regulatory vacuum with liability defaulting, untested, to the human principal.

---

## Open questions / verification gaps

- The claim that SA is a "bottom-performing market for 3DS2 frictionless rates" [14] was not traced to a primary, dated source — worth direct follow-up before relying on it.
- The full SARB/FSCA AI report PDF (Nov 2025) was not text-searched for a possible stray "agentic" or "agent" mention — the summary claims are secondary-source only.
- Developer documentation for PayGate, Adumo, iKhokha, and Netcash was not directly reached — their tokenization/recurring-API maturity relative to Peach/Stitch/Ozow is unverified.
- Whether any SA bank or PSP is a named participant in Visa's TAP, Mastercard's AP4M, or Stripe's ACP/SPT beyond the Visa Intelligent Commerce Connect merchant-acceptance announcement was not found — worth a direct check of each scheme's partner list for SA entities.
- Current (2024–2026) primary PASA/SARB 3DS2 enforcement text was not located; the only primary mandate source dates to 2014 (3DS1 era).

## Spin-off idea

- Worth a short follow-up recon (or a direct fetch of the Peach Payments recurring-without-3DS docs and the Visa Core Rules PDF) to confirm whether a scoped, spending-capped VRP-or-MIT-based "agent purchasing" pilot is buildable in SA today on Peach/Stitch/Capitec rails alone, without waiting on SARB or a card-scheme agent protocol — this is the most actionable near-term path implied by the research and wasn't independently scoped here.

## Source list

1. Peach Payments developer docs — https://developer.peachpayments.com/ (primary)
2. Peach Payments checkout tokenisation — https://developer.peachpayments.com/docs/checkout-tokenisation (primary)
3. Peach Payments — "Recurring payments without 3D Secure in the Mobile SDK" — https://support.peachpayments.com/support/solutions/articles/47001098659 (primary, content not fully accessible)
4. Stitch — tokenization / recurring payments — https://stitch.money/blog/tokenization-in-online-payments-understanding-card-tokenization ; https://stitch.money/solutions/recurring-payments (primary/vendor)
5. TechCabal — "Capitec VRP lets South Africans make recurring payments directly from bank" (2025-12-04) — https://techcabal.com/2025/12/04/capitec-vrp-lets-south-africans-make-recurring-payments-directly-from-bank/ (secondary/press)
6. SARB — Fintech / Innovation Hub — https://www.resbank.co.za/en/home/what-we-do/fintech (primary)
7. TechTimes / ITWeb — Ozow FNB/RMB bank-API payments (2026-07-30) — https://www.techtimes.com/articles/322243 ; https://www.itweb.co.za/article/ozow-fnb-and-rmb-plug-into-api-payments/GxwQD71DPwAvlPVo (secondary/press)
8. FinasA — "Agentic payments: shaping the future of South African commerce" — https://www.finasa.org.za/post/agentic-payments-shaping-the-future-of-south-african-commerce (primary, industry body, aspirational/opinion)
9. Stripe Newsroom — Stripe/OpenAI Instant Checkout — https://stripe.com/newsroom/news/stripe-openai-instant-checkout (primary)
10. OpenAI — "Buy it in ChatGPT" — https://openai.com/index/buy-it-in-chatgpt/ (primary)
11. Stripe Docs — Shared payment tokens — https://docs.stripe.com/agentic-commerce/concepts/shared-payment-tokens (primary)
12. PayFast blog — PASA 3D Secure CNP mandate (2014) — https://payfast.io/blog/pasa-3d-secure-cnp-transactions/ (secondary/vendor restating regulator mandate)
13. Ravelin / SEON / 2accept — 3DS2 frictionless-flow explainers (secondary, general industry mechanism)
14. Source not independently pinned — lead only, flagged low-medium confidence
15. SARB/FSCA — "Artificial Intelligence in the South African Financial Sector" (2025-11-24) — https://www.resbank.co.za/content/dam/sarb/publications/prudential-authority/pa-public-awareness/covid-19-response/2025/artificial-intelligence-in-the-south-african-financial-sector/ (primary); secondary coverage: Lexology, Baker McKenzie, Cliffe Dekker Hofmeyr
16. PASA — https://pasa.org.za/ (primary, homepage checked, no AI/agentic content found)
17. SARB — Payments Ecosystem Modernisation (PEM) — https://www.resbank.co.za/en/home/what-we-do/payments-and-settlements/pem (primary); Polity (2026-05-22) — https://www.polity.org.za/article/south-africas-payments-regulatory-framework-third-draft-of-authorisation-framework-published-for-comment-2026-05-22 ; Bowmans legal alert (secondary)
18. Bowmans — draft Authorisation Framework analysis (secondary/legal)
19. SARB — PayShap launch press release (2023-03-17) — https://www.resbank.co.za/content/dam/sarb/publications/media-releases/2023/payshap-/ (primary)
20. TechCentral — "How AI agents could rewrite the rules of South African banking" (2026-06-08) — https://techcentral.co.za/how-ai-agents-could-rewrite-the-rules-of-south-african-banking/282406/ (secondary)
21. Stuff SA / The Conversation — "An AI agent spent your money – can anyone prove you authorised it?" (2026-08-14) — https://stuff.co.za/2026/08/14/an-ai-agent-spent-your-money-can-anyone-prove-you-authorised-it/ (secondary)
22. Engineering News / Absa — "SA banks are already using agentic AI" (2026-03-27) — https://www.engineeringnews.co.za/article/sa-banks-are-already-using-agentic-ai-heres-why-it-matters-for-customers-2026-03-27 (secondary/primary-adjacent)
23. Business Report — "Visa opens the door to AI-driven shopping for businesses worldwide" (2026-04-21) — https://businessreport.co.za/economy/2026-04-21-visa-opens-the-door-to-ai-driven-shopping-for-businesses-worldwide/ (SA press)
24. TechAfrica News — "Visa Launches Intelligent Commerce Connect" (2026-04-22) — https://techafricanews.com/2026/04/22/visa-inc-launches-intelligent-commerce-connect-to-power-ai-driven-payments/ (secondary)
25. PYMNTS — "Mastercard Debuts Agent Pay" (2025-04-29) — https://www.pymnts.com/mastercard/2025/mastercard-debuts-agent-pay-to-promote-agentic-commerce-future/ (press)
26. Mastercard South Africa — Agent Pay localized page — https://www.mastercard.com/za/en/business/artificial-intelligence/mastercard-agent-pay.html (primary, marketing-only content found)
27. Google Cloud Blog — "Announcing AP2" (2025-09-16) — https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol (primary)
28. Google Blog — donating AP2 to FIDO Alliance — https://blog.google/products-and-platforms/platforms/google-pay/agent-payments-protocol-fido-alliance/ (primary)
29. Norton Rose Fulbright — "PSD3 and PSR: From provisional agreement to 2026 readiness" — https://www.nortonrosefulbright.com/en/knowledge/publications/cedd39c6/psd3-and-psr-from-provisional-agreement-to-2026-readiness (legal analysis)
30. Ryft — "PSD3: what's changing and how to prepare (2026)" — https://www.ryftpay.com/blog/psd3-whats-changing-and-how-to-prepare-2026 (secondary/vendor)
31. Digital Applied — "Who Vouches for the Bot?" — https://www.digitalapplied.com/blog/agent-checkout-authentication-card-networks-2026 (secondary/trade press)
32. The Financial Brand — "When an AI Agent Makes an Incorrect Purchase..." — https://thefinancialbrand.com/news/payments-trends/when-ai-agents-make-incorrect-purchases-whos-responsible-197147 (secondary/trade press)

**Confidence overview:** Findings on what is *not* published by SARB/PASA are high-confidence (multiple independent searches, corroborated by domestic legal commentary noting the same gap). Findings on card-scheme global programme status are high-confidence for the primary-sourced items (Visa, Google/AP2 official posts) and medium for secondary-press items (Mastercard AP4M mechanics, "first transaction" claims). The SA-frictionless-3DS-rate claim and the exact scope of Peach's 3DS-bypass conditions are the two weakest links in this report and should not be treated as settled without direct primary-source verification.
