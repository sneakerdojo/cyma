# [Offering Name] — depth content template

> Fill in the sections below. Each section has a guideline + example. When you're done, hand the file back and I'll move the content into `src/data/products.ts`.
>
> Tone: punchy, specific, second-person ("you / your"). No buzzwords ("synergy", "leverage", "robust", "best-in-class"). No generic benefit phrases ("save time and money") — explain the mechanism.

---

## 1. Stats banner (3–4 metrics)

> 3 to 4 specific numbers that go directly under the page hero. Use real metrics from your own deployments where possible. If you don't have hard numbers yet, use credible projections. Each stat = one number + one short label.

| value | label |
|---|---|
| `30s` | `average response time` |
| `48hr` | `setup to live` |
| `3.5×` | `more meetings booked` |
| `0` | `cold leads` |

---

## 2. Capability deep-dives (one per `whatItDoes` bullet)

> For each `whatItDoes` bullet on this offering, write a 100–150 word expansion. The expansion should answer:
> - What does this actually do? (mechanism)
> - How does it do it? (system / tech / process)
> - What's the outcome for the customer? (result)
>
> Keep paragraphs short (3–5 lines max). Use specific numbers + tool names where helpful.

### Capability 1: [bullet title from products.ts]

**Heading (4–7 words):** `Catch every lead before competitors do`

**Body (100–150 words):**

> When a lead fills in your form, comments on an ad, or DMs your LinkedIn page, our system picks it up in real time — no polling delays, no daily exports.
>
> We unify intake from your website, Google Ads, Meta Ads, LinkedIn, Facebook lead-gen forms, inbound email, and WhatsApp into a single pipeline. Every touch is timestamped, source-tagged, and pushed straight into qualification — usually within 5–15 seconds of arrival.
>
> The result: when a competitor's autoresponder is still in queue, your AI is already in conversation with the lead.

**Highlights (optional chips/tags, comma-separated):** `Website forms, Google Ads, Meta Ads, LinkedIn, WhatsApp, Email`

---

### Capability 2: [next bullet]

**Heading:**
**Body:**
**Highlights:**

---

### Capability 3: [next bullet]

…(repeat for each bullet)

---

## 3. Sample outputs (2–4 artifacts)

> Show the actual output the AI produces. For Lead Gen: a sample first-touch email + a sample lead score. For Voice/Chat: a sample transcript + sample appointment confirmation. For Newsletter: a sample issue header + a sample story summary. For Social: a sample LinkedIn post + Instagram caption.
>
> Each artifact = label + short caption + body + format.

### Sample 1

**Label:** `Sample first-touch email`

**Caption (1–2 sentences):**
> What the AI actually sends to a new lead within 30 seconds of arrival. Tuned to your brand voice and the lead's specific source.

**Format:** `prose` *(options: prose / code / quote)*

**Body:**

```
Hey Tumi,

Saw you downloaded our cybersecurity benchmark report. The piece on
ransomware attribution costs is the section most CFOs flag too.

Quick question — was this for a specific compliance review you're
working on, or general planning? Either way, happy to point you to
the parts most relevant to your industry.

I have a 15 minute slot on Thursday at 11:00 if you'd like to chat
through what stood out — link below.

— Sara, Octio
```

---

### Sample 2

**Label:** `Sample lead score JSON`

**Caption:** `What gets handed to your CRM after qualification.`

**Format:** `code`

**Body:**

```json
{
  "leadId": "lead_2026_05_10_8341",
  "score": 78,
  "band": "warm",
  "fit": {
    "industry": "Financial Services",
    "size": "Mid-market (250-1000 employees)",
    "icpMatch": 0.82
  },
  "intent": {
    "source": "ad-cybersecurity-report",
    "engagementSignals": ["downloaded report", "visited pricing page", "replied to follow-up"],
    "urgency": "medium"
  },
  "recommendedAction": "Book discovery call within 48 hours",
  "assignedTo": "Sara (mid-market team)"
}
```

---

## Notes for me (Claude)

> If anything is unclear or I should infer something, leave a `// TODO` comment here and I'll handle it during integration.
