# Octio Embeddable Chat Widget — Design

> ⚠️ **SUPERSEDED on 2026-05-12.** This spec has been replaced by [`2026-05-12-lead-gen-superseded.md`](./2026-05-12-lead-gen-superseded.md), which incorporates verified conversion benchmarks (3-7% engagement, 0.4-1.4% end-to-end booking — not vendor-claimed numbers), corrects the qualification order to Need-first (not BANT), makes WhatsApp handoff first-class, and verifies the Mastra v1.0 multi-tenant workaround. Read the new spec; this one is kept only for traceability.

**Status:** Draft, awaiting approval. Day 2 of the 7-day build plan.
**Author:** Simekani + Claude (Opus 4.7)
**Last updated:** 2026-05-12
**Powers:** Voice & Chat Agents SKU (chat half) + AI Lead Generation SKU
**Builds in:** existing `cyma` repo's worker + new `apps/widget/` package

---

## 1. Goal

Let a customer paste **one `<script>` tag** on their website and get a working AI chat agent — branded to their business, qualifying their leads, booking discovery calls into their calendar — within 5 minutes of pasting.

Reuses ~80% of the existing Octo chat infrastructure on octio.co.za. Difference: multi-tenant, light-weight bundle, cross-origin via postMessage iframe bridge.

## 2. The integration experience (customer-side)

```html
<!-- Customer pastes this into their site's <head> or before </body> -->
<script src="https://widget.octio.co.za/embed.js"
        data-tenant="acme-plumbing"
        async></script>
```

That's it. The script:
1. Fetches `tenant_agent_config` for `acme-plumbing` (cached at CDN edge)
2. Injects a floating button bottom-right matching the tenant's brand colour
3. On click, opens an iframe rendering the full chat UI
4. iframe is hosted at `widget.octio.co.za/embed/{tenantId}` — no cross-origin headaches
5. Customer's site → iframe → worker via same-origin from iframe to widget.octio.co.za

## 3. Architecture

```
Customer site (acme-plumbing.com)
   │
   ├─ <script src="widget.octio.co.za/embed.js" data-tenant="acme-plumbing">
   │
   ▼
   embed.js (<5kB gzipped):
   • injects floating button
   • on click → mounts iframe at widget.octio.co.za/embed/acme-plumbing
   • postMessage bridge for: open/close, prefill from host page, lead-captured events
   │
   ▼
widget.octio.co.za (separate subdomain on infra-01)
   ├─ /embed.js                        Serves the loader script (versioned)
   ├─ /embed/:tenantSlug               Renders the iframe — Vite-built React app
   │                                   Lightweight: 2D CSS orb (no Three.js),
   │                                   Tailwind, react-hook-form, ~50kB gzipped
   │
   └─ Calls existing /chat/step + /chat/event + /book/* routes,
      tagged with tenant_id resolved from tenantSlug
```

## 4. Multi-tenancy

### Tenant resolution

`tenantSlug` (URL-friendly, e.g. `acme-plumbing`) maps to `tenant_id` via:

```sql
CREATE TABLE tenant_slugs (
  slug        TEXT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL REFERENCES tenants(id),
  active      BOOLEAN DEFAULT TRUE
);
```

### Per-tenant agent config

Lives in `tenant_agent_config` (already specced in 7-day plan day 2):

```typescript
{
  agentName: 'Octo' | 'Acme Bot' | string,   // what the bot calls itself
  brand: {
    primaryColor: string,                     // hex
    secondaryColor: string,
    fontFamily: string,
    logoUrl: string,
    darkMode: boolean
  },
  chat: {
    openingMessage: string,                   // "Hi! I'm Acme's AI receptionist..."
    placeholder: string,                      // input placeholder
    quickReplies: string[],                   // optional shortcut buttons
    suggestedPromptsByEntryPath: Record<string, string[]>  // page-aware
  },
  knowledge: {
    sources: Array<{ kind: 'url' | 'text' | 'faq', value: string }>,
    serviceCatalogue: Array<{ name, description, price?, link? }>,
    faq: Array<{ q, a }>
  },
  flow: {
    bookingEnabled: boolean,
    bookingCalendarId: string|null,
    qualifyingQuestions: string[],
    escalation: { email, whatsapp?, slack? },
    handoffTriggers: string[]
  }
}
```

The existing step-engine prompts in `worker/src/conversation/steps.ts` and Octo system prompt get refactored to consume this config instead of hardcoded Octio strings (this is the §9.5 readiness rules from the admin dashboard spec — now we actually use them).

## 5. Worker routes

New + reused:

| Method | Path | Purpose |
|---|---|---|
| GET | `/embed.js` (CDN) | The 5kB loader — versioned, cached aggressively |
| GET | `/embed/:tenantSlug` | Server-rendered iframe page (full chat UI) |
| GET | `/api/widget/:tenantSlug/config` | Tenant config + brand for the loader (cacheable 60s) |
| POST | `/chat/step` (existing) | Now resolves tenant from request origin/JWT — adds tenant_id to all queries |
| POST | `/chat/event` (existing) | Same — tenant-scoped events |
| POST | `/book` (existing) | Same — books into tenant's calendar |

## 6. Frontend

Two artifacts:

### 6.1 `embed.js` loader (vanilla JS, <5kB gzipped)

```javascript
// pseudocode
(function() {
  const script = document.currentScript;
  const tenant = script.dataset.tenant;
  const config = await fetch(`https://widget.octio.co.za/api/widget/${tenant}/config`);

  // Inject styles
  injectStyles({ primaryColor: config.brand.primaryColor });

  // Inject floating button
  const btn = document.createElement('button');
  btn.className = 'octio-widget-btn';
  btn.innerHTML = config.brand.logoUrl ? `<img src="${config.brand.logoUrl}">` : '💬';
  btn.onclick = openChat;
  document.body.appendChild(btn);

  function openChat() {
    if (document.getElementById('octio-widget-iframe')) return;
    const iframe = document.createElement('iframe');
    iframe.id = 'octio-widget-iframe';
    iframe.src = `https://widget.octio.co.za/embed/${tenant}?host=${encodeURIComponent(location.href)}`;
    iframe.style.cssText = 'position:fixed;bottom:90px;right:20px;width:380px;height:600px;border:0;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.2);z-index:99999';
    document.body.appendChild(iframe);

    // postMessage bridge — listen for close, lead-captured, resize events
    window.addEventListener('message', (e) => {
      if (e.origin !== 'https://widget.octio.co.za') return;
      handleWidgetMessage(e.data);
    });
  }
})();
```

### 6.2 `apps/widget/` — the iframe app

- New Vite + React + Tailwind app, separate `dist/` bundle from main octio.co.za
- 2D CSS orb (no Three.js — drops ~900kB)
- Reuses InteractiveChat / DoneFollowUp / SchedulerPanel etc. from existing code
- Builds to a single chunked bundle ~50kB gzipped (vs 600kB for octio.co.za)
- Served by worker as a static asset OR via CDN

## 7. Embed customisation knobs (in `<script>` data attributes)

```html
<script src="..."
        data-tenant="acme-plumbing"
        data-position="bottom-right"
        data-launcher="custom-class-name"
        data-initial-message="Got a leak? Tell me about it."
        data-hide-on="/checkout, /thank-you"
        async></script>
```

Override per-page if needed. Defaults to `tenant_agent_config`.

## 8. Security

- iframe `sandbox="allow-scripts allow-forms allow-popups allow-same-origin"` 
- CSP on the iframe: only allow worker + ElevenLabs + necessary asset CDNs
- Worker validates `tenant_id` from `tenant_slugs` lookup, never trusts client
- Rate limit per tenant: 100 chats/IP/day (configurable)
- No customer data crosses tenants — every query goes through `scoped()` helper
- `X-Frame-Options: ALLOWALL` on the iframe route specifically — every other route stays restrictive

## 9. Day-2 MVP scope

**In:**
- Loader script + iframe + worker routes
- Multi-tenancy resolution from slug → tenant_id
- Brand color + opening message customisation
- All existing Octo chat features work for tenants (steps, scheduler, history, voice input)
- Lead captured emits postMessage to host page (so customer's analytics can fire)

**Out (week 2+):**
- Customer dashboard with chat analytics (covered in admin dashboard week 2)
- Multi-language UI translations
- Custom CSS injection
- Webhook on lead-captured for external CRMs
- Mobile-app SDK versions
- WhatsApp UI (chat widget on web only; WhatsApp is separate channel)

## 10. Estimate (day 2 of 7-day plan)

~8 hours:
- 1h: Worker routes + tenant_slugs migration + config endpoint
- 2h: embed.js loader (vanilla JS, minified bundle pipeline)
- 2h: Vite `apps/widget/` app — strip Three.js, 2D CSS orb, lightweight build
- 2h: Refactor existing chat infrastructure to consume `tenant_agent_config` instead of hardcoded Octio strings
- 1h: Test on a fake customer site, fix CORS / iframe / postMessage bugs, deploy

## 11. Approval checklist
- [ ] Integration experience (§2) — one script tag → working chat → approved
- [ ] Architecture (§3) — separate widget.octio.co.za subdomain → approved
- [ ] Multi-tenant model (§4) including `tenant_slugs` + `tenant_agent_config` → approved
- [ ] API surface (§5) — **needs explicit approval per global rule**
- [ ] MVP scope (§9) → approved
- [ ] Security model (§8) → approved
- [ ] 8h estimate for day 2 → approved
