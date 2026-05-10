# Octio product/service depth content

This folder holds the long-form copy for each product + service detail page. Each file maps to one entry in `src/data/products.ts`.

## Status

| Slug | File | Stats | Deep-dives | Samples |
|---|---|---|---|---|
| `lead-generation` | [lead-generation.md](./lead-generation.md) | ✅ drafted | ⏳ TODO | ⏳ TODO |
| `voice-chat` | [voice-chat.md](./voice-chat.md) | ✅ drafted | ⏳ TODO | ⏳ TODO |
| `social-media` | [social-media.md](./social-media.md) | ✅ drafted | ⏳ TODO | ⏳ TODO |
| `newsletter` | [newsletter.md](./newsletter.md) | ✅ drafted | ⏳ TODO | ⏳ TODO |
| `agentic-app-dev` | [agentic-app-dev.md](./agentic-app-dev.md) | ✅ drafted | ⏳ TODO | ⏳ TODO |
| `custom-workflows` | [custom-workflows.md](./custom-workflows.md) | ✅ drafted | ⏳ TODO | ⏳ TODO |
| `corporate-advisory` | [corporate-advisory.md](./corporate-advisory.md) | ✅ drafted | ⏳ TODO | ⏳ TODO |

## How to fill these in

1. Read `_TEMPLATE.md` once — explains the style + frameworks.
2. Pick the offering you want to flesh out.
3. Fill in the capability deep-dives (one per `whatItDoes` bullet) and the sample outputs.
4. Stats banners are pre-filled with reasonable defaults — edit if you have better numbers.
5. Hand any completed file back; I'll move the content into `src/data/products.ts` and the detail page will render the new sections automatically.

## Style guide

- **Specific numbers beat vague claims.** "30s response time" beats "fast response."
- **Mechanism + outcome.** Don't just say what — say how, and what you get.
- **Second-person.** "You" / "your" — not "users" or "the customer."
- **No buzzwords.** Avoid: synergy, leverage, robust, best-in-class, cutting-edge, world-class, seamless.
- **Avoid generic benefit language.** "Saves time and money" without a mechanism is filler.
- **Short paragraphs.** Three sentences max per paragraph for mobile readability.
- **One idea per sentence.** If a sentence has two `and`s, split it.

## Order of operations

You don't need to fill these in all at once. Suggested order:

1. **Lead Generation** first — it's the live product, has real metrics
2. **Corporate Advisory** — highest-ticket service, depth matters most
3. **Voice & Chat** — second most likely to convert from cold visitor
4. **App Dev / Workflows** — competitive differentiation
5. **Social Media / Newsletter** — lower-ticket, last

Once any file is complete, ping me and I'll integrate.
