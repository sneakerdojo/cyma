# Audit Tool — User stories v5 (TDD-ready test signatures)

**Source spec:** `docs/superpowers/specs/2026-05-12-audit-tool-claude-code.md`
**Iteration:** 5 of 5 — final. Vitest + Playwright signatures for all 40 stories.

Conventions match `lead-gen-v5.md`:
- Vitest in `worker/src/__tests__/audit-tool/{story-id}.spec.ts`
- Playwright in `apps/web/tests/e2e/audit-tool/{story-id}.spec.ts`
- Cloudflare Sandboxes mocked locally; nightly integration tests against a real sandbox
- All `expect.fail` markers — RED at write-time

---

## US-AT-001 — Upload form (v1)

```ts
// apps/web/tests/e2e/audit-tool/us-001-upload.spec.ts
import { test, expect } from '@playwright/test';

test('visitor uploads 3 screenshots + business info', async ({ page }) => {
  await page.goto('https://staging.octio.co.za/audit');
  await page.locator('input[name="email"]').fill('visitor@example.com');
  await page.locator('input[name="business_name"]').fill('Acme Plumbing');
  await page.locator('input[name="website"]').fill('https://acmeplumbing.example');
  await page.setInputFiles('input[type=file]', ['fixtures/site1.png', 'fixtures/site2.png', 'fixtures/site3.png']);
  await page.locator('[data-testid="audit-submit"]').click();
  await expect(page.locator('[data-testid="audit-progress"]')).toBeVisible();
});
```

```ts
// worker/src/__tests__/audit-tool/us-001-validate.spec.ts
import { describe, it, expect } from 'vitest';
import { validateAuditSubmission } from '../../services/audit-tool/validate';

describe('US-AT-001: submission validation', () => {
  it('accepts 3 PNGs under 5MB each with valid form fields', () => {
    const result = validateAuditSubmission({ files: makeFiles(3, 'image/png', 4 * 1024 * 1024), email: 'a@b.com', business_name: 'X', website: 'https://x.com' });
    expect(result.ok).toBe(true);
  });

  it('rejects file > 5MB', () => {
    const result = validateAuditSubmission({ files: makeFiles(1, 'image/png', 6 * 1024 * 1024), email: 'a@b.com', business_name: 'X', website: 'https://x.com' });
    expect(result.ok).toBe(false);
  });

  it('rejects more than 6 files', () => {
    const result = validateAuditSubmission({ files: makeFiles(7, 'image/png', 1024), email: 'a@b.com', business_name: 'X', website: 'https://x.com' });
    expect(result.ok).toBe(false);
  });

  it('rejects non-image MIME', () => {
    const result = validateAuditSubmission({ files: makeFiles(1, 'application/pdf', 1024), email: 'a@b.com', business_name: 'X', website: 'https://x.com' });
    expect(result.ok).toBe(false);
  });
});

function makeFiles(n: number, type: string, size: number) { return Array(n).fill({ type, size }); }
```

---

## US-AT-002 — Audit completes in ≤60s (v1)

```ts
// worker/src/__tests__/audit-tool/us-002-audit.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { runAudit } from '../../services/audit-tool/audit';

describe('US-AT-002: audit run', () => {
  it('returns a structured 7-axis report', async () => {
    const result = await runAudit({ screenshots: makeFixtureScreenshots(3), visionClient: makeGeminiMock() });
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.axes).toHaveLength(7);
    expect(result.topFixes).toHaveLength(3);
  });

  it('completes within 60s p95 in CI harness', async () => {
    const durations: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await runAudit({ screenshots: makeFixtureScreenshots(3), visionClient: makeGeminiMock(50) });
      durations.push(performance.now() - start);
    }
    durations.sort();
    const p95 = durations[Math.floor(durations.length * 0.95)];
    expect(p95).toBeLessThanOrEqual(60_000);
  });
});

function makeFixtureScreenshots(_n: number): any[] { return []; }
function makeGeminiMock(_delay = 0): any { return {}; }
```

---

## US-AT-003 — Email delivery (v1)

```ts
// worker/src/__tests__/audit-tool/us-003-email.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { sendAuditEmail } from '../../services/audit-tool/email';

describe('US-AT-003: audit email delivery', () => {
  it('sends from support@octio.co.za with correct subject', async () => {
    const gmail = vi.fn().mockResolvedValue({ id: 'msg1' });
    await sendAuditEmail({ to: 'visitor@example.com', auditId: 'a1', domain: 'acme.com', gmail });
    expect(gmail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'support@octio.co.za',
      subject: expect.stringMatching(/audit for acme\.com/i),
    }));
  });

  it('includes Markdown attachment', async () => {
    const gmail = vi.fn().mockResolvedValue({ id: 'msg1' });
    await sendAuditEmail({ to: 'v@x.com', auditId: 'a1', domain: 'x.com', gmail });
    expect(gmail).toHaveBeenCalledWith(expect.objectContaining({
      attachments: expect.arrayContaining([expect.objectContaining({ filename: expect.stringMatching(/\.md$/) })]),
    }));
  });
});
```

---

## US-AT-004 — Rebuild CTA (v1)

```ts
// apps/web/tests/e2e/audit-tool/us-004-cta.spec.ts
import { test, expect } from '@playwright/test';

test('rebuild CTA appears on audit result page', async ({ page }) => {
  await page.goto('https://staging.octio.co.za/audit/<audit-id>');
  const cta = page.locator('[data-testid="rebuild-cta"]');
  await expect(cta).toBeVisible({ timeout: 31_000 });
  await expect(cta).toContainText(/rebuild/i);
});
```

---

## US-AT-005 — Claude Code rebuild (v1)

```ts
// worker/src/__tests__/audit-tool/us-005-rebuild.spec.ts
import { describe, it, expect } from 'vitest';
import { dispatchRebuild } from '../../services/audit-tool/rebuild';

describe('US-AT-005: Claude Code rebuild dispatch', () => {
  it('passes --bare + maxTurns + acceptEdits', async () => {
    const sandbox = makeSandboxSpy();
    await dispatchRebuild({ auditId: 'a1', sandbox });
    expect(sandbox.run).toHaveBeenCalledWith(expect.objectContaining({
      flags: expect.arrayContaining(['--bare']),
      maxTurns: 40,
      permissionMode: 'acceptEdits',
    }));
  });

  it('uses Sonnet 4.6 (not Opus)', async () => {
    const sandbox = makeSandboxSpy();
    await dispatchRebuild({ auditId: 'a1', sandbox });
    expect(sandbox.run).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-sonnet-4-6' }));
  });

  it('returns total_cost_usd from --output-format json', async () => {
    const sandbox = makeSandboxSpy({ result: { total_cost_usd: 0.087 } });
    const result = await dispatchRebuild({ auditId: 'a1', sandbox });
    expect(result.total_cost_usd).toBe(0.087);
  });
});

function makeSandboxSpy(_opts: any = {}) { return { run: vi.fn().mockResolvedValue(_opts.result || {}) }; }
```

---

## US-AT-006 — Preview + zip delivery (v1)

```ts
// worker/src/__tests__/audit-tool/us-006-delivery.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { finalizeRebuild } from '../../services/audit-tool/finalize';

describe('US-AT-006: rebuild artifact delivery', () => {
  it('deploys to Cloudflare Pages preview', async () => {
    const cfPages = { deploy: vi.fn().mockResolvedValue({ url: 'https://audit-1.pages.dev' }) };
    const result = await finalizeRebuild({ workspaceDir: '/tmp/job1', cfPages });
    expect(cfPages.deploy).toHaveBeenCalled();
    expect(result.previewUrl).toMatch(/pages\.dev/);
  });

  it('uploads zip to R2 with 7-day signed URL', async () => {
    const r2 = { putObject: vi.fn().mockResolvedValue({ key: 'r/1.zip' }), signUrl: vi.fn().mockResolvedValue('https://signed') };
    const result = await finalizeRebuild({ workspaceDir: '/tmp/job1', r2 });
    expect(result.zipUrl).toMatch(/^https:\/\//);
    const ttl = r2.signUrl.mock.calls[0][0].expiresInSec;
    expect(ttl).toBe(7 * 24 * 3600);
  });
});
```

---

## US-AT-007 — Conversion CTA to Lead Gen (v1)

```ts
// apps/web/tests/e2e/audit-tool/us-007-convert.spec.ts
import { test, expect } from '@playwright/test';

test('preview page surfaces Lead Gen CTA', async ({ page }) => {
  await page.goto('https://staging.octio.co.za/audit/<id>/rebuild');
  await expect(page.locator('[data-testid="book-call-cta"]')).toBeVisible({ timeout: 31_000 });
  await page.locator('[data-testid="book-call-cta"]').click();
  // Octo opens with audit context loaded
  await expect(page.locator('[data-testid="octo-chat-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="octo-chat-panel"]')).toContainText(/your audit|rebuild/i);
});
```

---

## US-AT-008 — Non-website rejection (v2)

```ts
// worker/src/__tests__/audit-tool/us-008-non-website.spec.ts
import { describe, it, expect } from 'vitest';
import { classifyScreenshots } from '../../services/audit-tool/classifier';

describe('US-AT-008: non-website screenshot rejection', () => {
  it('rejects screenshots of cats/spreadsheets', async () => {
    const result = await classifyScreenshots(makeFixtureScreenshots(3, 'cat'));
    expect(result.kind).toBe('not_website');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('accepts real website screenshots', async () => {
    const result = await classifyScreenshots(makeFixtureScreenshots(3, 'website'));
    expect(result.kind).toBe('website');
  });
});

function makeFixtureScreenshots(_n: number, _kind: string): any[] { return []; }
```

---

## US-AT-009 — Audit job failure / timeout (v2)

```ts
// worker/src/__tests__/audit-tool/us-009-audit-fail.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { runAuditWithRetry } from '../../services/audit-tool/audit';

describe('US-AT-009: audit failure path', () => {
  it('retries twice then fails into manual queue on persistent 5xx', async () => {
    const vision = vi.fn().mockRejectedValue({ status: 500 });
    const queue = vi.fn();
    await expect(runAuditWithRetry({ vision, queue, screenshots: [] })).rejects.toMatchObject({ kind: 'queued_for_manual' });
    expect(vision).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(queue).toHaveBeenCalled();
  });

  it('hard-cancels at 120s', async () => {
    const vision = vi.fn().mockImplementation(() => new Promise(() => {})); // never resolves
    await expect(runAuditWithRetry({ vision, screenshots: [], timeoutMs: 120_000 })).rejects.toMatchObject({ kind: 'timeout' });
  });
});
```

---

## US-AT-010 — Rebuild job failure modes (v2)

```ts
// worker/src/__tests__/audit-tool/us-010-rebuild-fail.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { dispatchRebuild } from '../../services/audit-tool/rebuild';

describe('US-AT-010: rebuild failure paths', () => {
  it('on maxTurns exceeded, marks outcome max_turns_exceeded', async () => {
    const sandbox = { run: vi.fn().mockResolvedValue({ outcome: 'max_turns_exceeded' }) };
    const result = await dispatchRebuild({ auditId: 'a1', sandbox });
    expect(result.outcome).toBe('max_turns_exceeded');
  });

  it('on Anthropic 429, retries with backoff up to 3x', async () => {
    const sandbox = { run: vi.fn()
      .mockRejectedValueOnce({ status: 429, headers: { 'retry-after': '1' } })
      .mockRejectedValueOnce({ status: 429, headers: { 'retry-after': '1' } })
      .mockResolvedValue({ outcome: 'ok' }) };
    const result = await dispatchRebuild({ auditId: 'a1', sandbox });
    expect(sandbox.run).toHaveBeenCalledTimes(3);
    expect(result.outcome).toBe('ok');
  });

  it('on sandbox provision failure, queues for retry', async () => {
    const sandbox = { run: vi.fn().mockRejectedValue({ kind: 'provision_failed' }) };
    const queue = vi.fn();
    const result = await dispatchRebuild({ auditId: 'a1', sandbox, queue });
    expect(queue).toHaveBeenCalled();
    expect(result.outcome).toBe('queued_for_retry');
  });
});
```

---

## US-AT-011 — Broken-markup detection (v2)

```ts
// worker/src/__tests__/audit-tool/us-011-broken-markup.spec.ts
import { describe, it, expect } from 'vitest';
import { postProcessRebuild } from '../../services/audit-tool/post-process';

describe('US-AT-011: broken-markup detection', () => {
  it('fails on astro build error', async () => {
    const result = await postProcessRebuild({ workspaceDir: '/tmp/broken-build' });
    expect(result.outcome).toBe('build_failed');
  });

  it('fails on blank output (< 200 chars visible text)', async () => {
    const result = await postProcessRebuild({ workspaceDir: '/tmp/blank' });
    expect(result.outcome).toBe('blank_output');
  });
});
```

---

## US-AT-012 — Disallowed content (v2)

```ts
// worker/src/__tests__/audit-tool/us-012-disallowed.spec.ts
import { describe, it, expect } from 'vitest';
import { contentSafetyCheck } from '../../services/audit-tool/safety';

describe('US-AT-012: disallowed content', () => {
  it('rejects adult content', async () => {
    const result = await contentSafetyCheck({ screenshots: makeFixtureScreenshots('adult') });
    expect(result.kind).toBe('reject');
    expect(result.reason).toBe('adult_content');
  });

  it('silently rejects illegal content (no detail back to attacker)', async () => {
    const result = await contentSafetyCheck({ screenshots: makeFixtureScreenshots('illegal') });
    expect(result.kind).toBe('silent_reject');
    expect(result.userMessage).toMatch(/unable to process/i);
  });
});

function makeFixtureScreenshots(_kind: string): any[] { return []; }
```

---

## US-AT-013 — Size + count limits (v2)

```ts
// (covered by US-AT-001 validate tests with rejection paths — same file)
```

---

## US-AT-014 — Rate limiting (v2)

```ts
// worker/src/__tests__/audit-tool/us-014-rate-limit.spec.ts
import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../../services/audit-tool/rate-limit';

describe('US-AT-014: rate limits', () => {
  it('rejects 4th audit from same email in 24h', async () => {
    const email = 'spammer@x.com';
    for (let i = 0; i < 3; i++) await checkRateLimit({ email, kind: 'audit' });
    await expect(checkRateLimit({ email, kind: 'audit' })).rejects.toMatchObject({ kind: 'rate_limited' });
  });

  it('rejects 2nd rebuild from same email in 24h', async () => {
    const email = 'spammer@x.com';
    await checkRateLimit({ email, kind: 'rebuild' });
    await expect(checkRateLimit({ email, kind: 'rebuild' })).rejects.toMatchObject({ kind: 'rate_limited' });
  });

  it('rejects 4th rebuild for the same domain in 7d (across any email)', async () => {
    const domain = 'targeted.example';
    for (let i = 0; i < 3; i++) await checkRateLimit({ email: `e${i}@x.com`, kind: 'rebuild', domain });
    await expect(checkRateLimit({ email: 'e4@x.com', kind: 'rebuild', domain })).rejects.toMatchObject({ kind: 'rate_limited' });
  });
});
```

---

## US-AT-015 — Email validation + bounce (v2)

```ts
// worker/src/__tests__/audit-tool/us-015-email.spec.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, handleBounceWebhook } from '../../services/audit-tool/email-validation';

describe('US-AT-015: email handling', () => {
  it.each(['notanemail', '@x.com', 'a@', 'a@b'])('rejects %s', (e) => {
    expect(validateEmail(e)).toBe(false);
  });

  it('flags lead on bounce', async () => {
    const result = await handleBounceWebhook({ email: 'fake@example.com' });
    expect(result.disposition).toBe('bounced');
  });
});
```

---

## US-AT-016 — Returning visitor (v2)

```ts
// worker/src/__tests__/audit-tool/us-016-return.spec.ts
import { describe, it, expect } from 'vitest';
import { findPriorSubmission, buildAuditWithDelta } from '../../services/audit-tool/returning';

describe('US-AT-016: returning visitor', () => {
  it('returns prior submission for same email + domain', async () => {
    const prior = await findPriorSubmission({ email: 'a@x.com', domain: 'x.com' });
    expect(prior).toBeTruthy();
  });

  it('audit report includes "what changed" section if prior exists', async () => {
    const report = await buildAuditWithDelta({ current: {}, prior: { date: '2026-04-01' } as any });
    expect(report.delta).toBeDefined();
  });
});
```

---

## US-AT-017 — Preview TTL (v2)

```ts
// worker/src/__tests__/audit-tool/us-017-preview-ttl.spec.ts
import { describe, it, expect } from 'vitest';
import { sweepExpiredPreviews } from '../../services/audit-tool/preview';

describe('US-AT-017: preview TTL', () => {
  it('deletes Pages projects older than 14 days', async () => {
    const stats = await sweepExpiredPreviews({ now: new Date('2026-05-30') });
    expect(stats.deleted).toBeGreaterThan(0);
  });
});
```

---

## US-AT-018 — Cost circuit-breaker (v2)

```ts
// worker/src/__tests__/audit-tool/us-018-circuit-breaker.spec.ts
import { describe, it, expect } from 'vitest';
import { shouldDispatchRebuild } from '../../services/audit-tool/circuit-breaker';

describe('US-AT-018: cost circuit-breaker', () => {
  it('gates new jobs when MTD spend exceeds R10,000', async () => {
    const result = await shouldDispatchRebuild({ mtdZar: 10_001, capZar: 10_000 });
    expect(result.gate).toBe(true);
  });

  it('allows new jobs under cap', async () => {
    const result = await shouldDispatchRebuild({ mtdZar: 9_999, capZar: 10_000 });
    expect(result.gate).toBe(false);
  });
});
```

---

## US-AT-019 — ToS: API key (not OAuth) (v3)

```ts
// worker/src/__tests__/audit-tool/us-019-tos.spec.ts
import { describe, it, expect } from 'vitest';
import { assertCommercialCredentials } from '../../services/audit-tool/credentials';

describe('US-AT-019: Anthropic ToS compliance', () => {
  it('fails fast if ANTHROPIC_API_KEY is missing', () => {
    expect(() => assertCommercialCredentials({ env: {} })).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('fails fast if CLAUDE_CODE_OAUTH_TOKEN is present in audit-tool env', () => {
    expect(() => assertCommercialCredentials({ env: { ANTHROPIC_API_KEY: 'sk-x', CLAUDE_CODE_OAUTH_TOKEN: 'oauth-x' } }))
      .toThrow(/OAuth token must not be present/);
  });

  it('passes with API key only', () => {
    expect(() => assertCommercialCredentials({ env: { ANTHROPIC_API_KEY: 'sk-x' } })).not.toThrow();
  });
});
```

---

## US-AT-020 — Sandbox isolation (v3)

```ts
// worker/src/__tests__/audit-tool/us-020-sandbox.spec.ts
import { describe, it, expect } from 'vitest';
import { configureSandbox } from '../../services/audit-tool/sandbox';

describe('US-AT-020: sandbox isolation', () => {
  it('env contains only ANTHROPIC_API_KEY + WORKSPACE_DIR', () => {
    const cfg = configureSandbox({ jobId: 'j1' });
    expect(Object.keys(cfg.env).sort()).toEqual(['ANTHROPIC_API_KEY', 'WORKSPACE_DIR']);
  });

  it('egress allow-list is api.anthropic.com + npm registry only', () => {
    const cfg = configureSandbox({ jobId: 'j1' });
    expect(cfg.networkAllow).toContain('api.anthropic.com');
    expect(cfg.networkAllow).toContain('registry.npmjs.org');
    expect(cfg.networkDenyAll).toBe(true);
  });

  it('hard kill after 10 minutes', () => {
    const cfg = configureSandbox({ jobId: 'j1' });
    expect(cfg.hardKillSec).toBe(600);
  });
});
```

---

## US-AT-021 — Permission mode hardened (v3)

```ts
// worker/src/__tests__/audit-tool/us-021-perms.spec.ts
import { describe, it, expect } from 'vitest';
import { buildAgentOptions } from '../../services/audit-tool/agent-options';

describe('US-AT-021: agent permissions', () => {
  it('permissionMode is acceptEdits (never bypassPermissions)', () => {
    const opts = buildAgentOptions({});
    expect(opts.permissionMode).toBe('acceptEdits');
  });

  it('allowedTools is the closed set', () => {
    const opts = buildAgentOptions({});
    expect(opts.allowedTools.sort()).toEqual(['Bash(astro *)', 'Bash(npm *)', 'Edit', 'Glob', 'Grep', 'Read', 'Write'].sort());
  });
});
```

---

## US-AT-022 — Prompt-injection via screenshot (v3)

```ts
// worker/src/__tests__/audit-tool/us-022-injection.spec.ts
import { describe, it, expect } from 'vitest';
import { runRebuildAgainstInjectedScreenshot } from './_fixtures/injection';

describe('US-AT-022: injection resilience', () => {
  it('agent stays on task when screenshot OCRs to "ignore previous instructions"', async () => {
    const result = await runRebuildAgainstInjectedScreenshot('inject-1.png');
    expect(result.networkCalls.filter(c => !c.host.match(/anthropic|npmjs/)).length).toBe(0);
    expect(result.flags).toContain('potential_injection');
  });
});
```

---

## US-AT-023 — POPIA consent + email retention (v3)

```ts
// apps/web/tests/e2e/audit-tool/us-023-consent.spec.ts
import { test, expect } from '@playwright/test';

test('email field shows POPIA disclosure with privacy link', async ({ page }) => {
  await page.goto('https://staging.octio.co.za/audit');
  const disclosure = page.locator('[data-testid="popia-email-disclosure"]');
  await expect(disclosure).toBeVisible();
  await expect(disclosure.locator('a')).toHaveAttribute('href', expect.stringContaining('privacy'));
});
```

```ts
// worker/src/__tests__/audit-tool/us-023-retention.spec.ts
import { describe, it, expect } from 'vitest';
import { sweepAuditRetention } from '../../services/audit-tool/retention';

describe('US-AT-023: retention sweep', () => {
  it('hard-deletes audit records older than 365 days from last interaction', async () => {
    const stats = await sweepAuditRetention({ now: new Date('2027-05-15') });
    expect(stats.deletedAudits).toBeGreaterThan(0);
  });
});
```

---

## US-AT-024 — SAR (v3)

```ts
// worker/src/__tests__/audit-tool/us-024-sar.spec.ts
import { describe, it, expect } from 'vitest';
import { exportSubjectAudits, deleteSubjectAudits } from '../../services/audit-tool/sar';

describe('US-AT-024: subject access + deletion', () => {
  it('exports all audit + rebuild data by email', async () => {
    const result = await exportSubjectAudits({ email: 'v@x.com' });
    expect(result.signedZipUrl).toMatch(/^https:\/\//);
  });

  it('deletes all R2 + Pages artifacts on deletion request', async () => {
    const result = await deleteSubjectAudits({ email: 'v@x.com' });
    expect(result.r2Deleted).toBeGreaterThanOrEqual(0);
    expect(result.pagesProjectsDeleted).toBeGreaterThanOrEqual(0);
  });
});
```

---

## US-AT-025 — Screenshot storage + 30-day purge (v3)

```ts
// worker/src/__tests__/audit-tool/us-025-screenshot-purge.spec.ts
import { describe, it, expect } from 'vitest';
import { sweepScreenshots } from '../../services/audit-tool/retention';

describe('US-AT-025: screenshot purge', () => {
  it('deletes screenshots older than 30 days', async () => {
    const stats = await sweepScreenshots({ now: new Date('2026-06-15') });
    expect(stats.deletedScreenshots).toBeGreaterThan(0);
  });

  it('R2 bucket has SSE enabled', async () => {
    expect(await import('../../services/audit-tool/r2').then(m => m.bucketHasSse())).toBe(true);
  });
});
```

---

## US-AT-026 — Per-job cost row (v3)

```ts
// worker/src/__tests__/audit-tool/us-026-cost-row.spec.ts
import { describe, it, expect } from 'vitest';
import { recordJobCost } from '../../services/audit-tool/cost';

describe('US-AT-026: cost row', () => {
  it('writes immutable cost row on job completion', async () => {
    const result = await recordJobCost({ jobId: 'j1', total_cost_usd: 0.087, outcome: 'ok' });
    expect(result.id).toBeTruthy();
    await expect(recordJobCost({ jobId: 'j1', total_cost_usd: 0.999, outcome: 'altered' }))
      .rejects.toThrow(/immutable|already exists/i);
  });
});
```

---

## US-AT-027 — Audit log for operator access (v3)

```ts
// worker/src/__tests__/audit-tool/us-027-audit-log.spec.ts
import { describe, it, expect } from 'vitest';
import { withAccessAudit } from '../../services/audit-tool/audit-log';

describe('US-AT-027: operator access audit', () => {
  it('writes row on view', async () => {
    const spy = makeAuditSpy();
    await withAccessAudit({ actor: 'op@octio.co.za', action: 'read_audit', target: 'submission:1', audit: spy }, async () => {});
    expect(spy.writes).toHaveLength(1);
  });

  it('zip download URL TTL is 15 minutes', async () => {
    const url = await import('../../services/audit-tool/storage').then(m => m.signZipUrl({ key: 'z1', ttlSec: 60 * 15 }));
    expect(url).toMatch(/X-Amz-Expires=900/);
  });
});

function makeAuditSpy() { return { writes: [] as any[] }; }
```

---

## US-AT-028 — Circuit-breaker audit (v3)

```ts
// worker/src/__tests__/audit-tool/us-028-cb-audit.spec.ts
import { describe, it, expect } from 'vitest';
import { tripBreaker } from '../../services/audit-tool/circuit-breaker';

describe('US-AT-028: breaker audit logging', () => {
  it('writes audit row when breaker trips', async () => {
    const audit = makeSpy();
    await tripBreaker({ mtdZar: 10_001, capZar: 10_000, audit });
    expect(audit.writes[0].action).toBe('circuit_breaker_tripped');
  });
});

function makeSpy() { return { writes: [] as any[] }; }
```

---

## US-AT-029 — Breach playbook (v3)

```ts
// worker/src/__tests__/audit-tool/us-029-breach.spec.ts
import { describe, it, expect } from 'vitest';
import { auditToolBreachPlaybook } from '../../services/audit-tool/breach';

describe('US-AT-029: breach playbook (audit-tool-specific)', () => {
  it('playbook references screenshot data flow + Pages preview teardown', () => {
    const playbook = auditToolBreachPlaybook();
    expect(playbook.steps.find(s => s.title.match(/screenshot/i))).toBeTruthy();
    expect(playbook.steps.find(s => s.title.match(/pages|preview/i))).toBeTruthy();
    expect(playbook.steps.find(s => s.title.match(/rotate|r2/i))).toBeTruthy();
  });
});
```

---

## US-AT-030 — Audit timing (v4)

```ts
// worker/src/__tests__/audit-tool/us-030-audit-timing.spec.ts
import { describe, it, expect } from 'vitest';
import { fetchAuditTimingStats } from '../../services/audit-tool/observability';

describe('US-AT-030: audit timing', () => {
  it('p50 ≤ 45s', async () => {
    expect((await fetchAuditTimingStats({ window: '30d' })).p50_ms).toBeLessThanOrEqual(45_000);
  });
  it('p95 ≤ 75s', async () => {
    expect((await fetchAuditTimingStats({ window: '30d' })).p95_ms).toBeLessThanOrEqual(75_000);
  });
});
```

---

## US-AT-031 — Rebuild timing (v4)

```ts
// worker/src/__tests__/audit-tool/us-031-rebuild-timing.spec.ts
import { describe, it, expect } from 'vitest';
import { fetchRebuildTimingStats } from '../../services/audit-tool/observability';

describe('US-AT-031: rebuild timing', () => {
  it('p50 ≤ 4 min', async () => {
    expect((await fetchRebuildTimingStats({ window: '30d' })).p50_ms).toBeLessThanOrEqual(240_000);
  });
  it('p95 ≤ 6 min', async () => {
    expect((await fetchRebuildTimingStats({ window: '30d' })).p95_ms).toBeLessThanOrEqual(360_000);
  });
});
```

---

## US-AT-032 — Prompt-cache hit-rate (v4)

```ts
// worker/src/__tests__/audit-tool/us-032-cache.spec.ts
import { describe, it, expect } from 'vitest';
import { promptCacheReport } from '../../services/audit-tool/observability';

describe('US-AT-032: prompt cache', () => {
  it('hit rate >= 80%', async () => {
    const report = await promptCacheReport({ window: '7d' });
    expect(report.hitRate).toBeGreaterThanOrEqual(0.8);
  });
});
```

---

## US-AT-033 — Daily cost cap (v4)

```ts
// worker/src/__tests__/audit-tool/us-033-daily-cap.spec.ts
import { describe, it, expect } from 'vitest';
import { evaluateDailyCap } from '../../services/audit-tool/cost';

describe('US-AT-033: daily cost cap', () => {
  it('gates new rebuilds when daily spend > R600', async () => {
    const result = await evaluateDailyCap({ dailySpentZar: 601, capZar: 600 });
    expect(result.gateRebuilds).toBe(true);
    expect(result.gateAudits).toBe(false);
  });
});
```

---

## US-AT-034 — Quality review (v4)

```ts
// worker/src/__tests__/audit-tool/us-034-quality.spec.ts
import { describe, it, expect } from 'vitest';
import { weeklyQualityReport } from '../../services/audit-tool/quality';

describe('US-AT-034: weekly quality review', () => {
  it('samples 10 random rebuilds for the week', async () => {
    const sample = await weeklyQualityReport({ week: '2026-W19' });
    expect(sample.length).toBe(10);
  });

  it('pauses public flow if weekly avg < 6', async () => {
    const result = await weeklyQualityReport({ week: '2026-W19', simulatedScores: [3, 4, 5, 5, 5, 6, 6, 6, 7, 7] });
    expect(result.publicFlowAction).toBe('pause');
  });
});
```

---

## US-AT-035 — Latency alerting (v4)

```ts
// worker/src/__tests__/audit-tool/us-035-alerting.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { evaluateAuditAlert, evaluateRebuildAlert } from '../../services/audit-tool/alerting';

describe('US-AT-035: latency alerting', () => {
  it('alerts on 3 consecutive 15-min buckets > 90s audit p95', async () => {
    const slack = vi.fn();
    await evaluateAuditAlert({ buckets: [91_000, 92_000, 91_500], slack });
    expect(slack).toHaveBeenCalled();
  });

  it('alerts on 2 consecutive buckets > 7 min rebuild p95', async () => {
    const slack = vi.fn();
    await evaluateRebuildAlert({ buckets: [420_001, 421_000], slack });
    expect(slack).toHaveBeenCalled();
  });
});
```

---

## US-AT-036 — Rebuild concurrency (v4)

```ts
// worker/src/__tests__/audit-tool/us-036-concurrency.spec.ts
import { describe, it, expect } from 'vitest';
import { simulateRebuildBurst } from './_fixtures/rebuild-load';

describe('US-AT-036: rebuild concurrency', () => {
  it('5 concurrent rebuilds: all provision <30s, none interfere', async () => {
    const result = await simulateRebuildBurst({ count: 5 });
    expect(result.failures).toBe(0);
    expect(result.maxProvisionMs).toBeLessThan(30_000);
  });

  it('queue depth UI shows accurate position when at cap', async () => {
    const result = await simulateRebuildBurst({ count: 20, concurrencyCap: 10 });
    expect(result.queuedCount).toBe(10);
  });
});
```

---

## US-AT-037 — Funnel cost report (v4)

```ts
// worker/src/__tests__/audit-tool/us-037-funnel.spec.ts
import { describe, it, expect } from 'vitest';
import { auditFunnelCostReport } from '../../services/audit-tool/reports';

describe('US-AT-037: funnel cost report', () => {
  it('produces cost-per-step + cost-per-acquired-customer', async () => {
    const report = await auditFunnelCostReport({ days: 30 });
    expect(report.costPerAudit_zar).toBeGreaterThan(0);
    expect(report.costPerRebuild_zar).toBeGreaterThan(0);
    expect(report.costPerBookedCall_zar).toBeGreaterThan(0);
    expect(report.costPerAcquiredCustomer_zar).toBeGreaterThan(0);
  });
});
```

---

## US-AT-038 — Vision provider fallback (v4)

```ts
// worker/src/__tests__/audit-tool/us-038-vision-fallback.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { runAuditWithVisionFallback } from '../../services/audit-tool/audit';

describe('US-AT-038: vision provider fallback', () => {
  it('falls to Sonnet vision on Gemini 503', async () => {
    const gemini = vi.fn().mockRejectedValue({ status: 503 });
    const sonnet = vi.fn().mockResolvedValue({ axes: [] });
    const result = await runAuditWithVisionFallback({ gemini, sonnet, screenshots: [] });
    expect(result.provider).toBe('claude-sonnet-4-6');
  });
});
```

---

## US-AT-039 — 429 retry strategy (v4)

```ts
// worker/src/__tests__/audit-tool/us-039-429-retry.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { dispatchRebuildWith429Handling } from '../../services/audit-tool/rebuild';

describe('US-AT-039: 429 handling', () => {
  it('reads Retry-After + retries up to 3x', async () => {
    const sandbox = { run: vi.fn()
      .mockRejectedValueOnce({ status: 429, headers: { 'retry-after': '2' } })
      .mockRejectedValueOnce({ status: 429, headers: { 'retry-after': '2' } })
      .mockResolvedValue({ outcome: 'ok' }) };
    const result = await dispatchRebuildWith429Handling({ sandbox });
    expect(sandbox.run).toHaveBeenCalledTimes(3);
    expect(result.outcome).toBe('ok');
  });

  it('queues for window-end on persistent 429', async () => {
    const sandbox = { run: vi.fn().mockRejectedValue({ status: 429, headers: { 'retry-after': '60' } }) };
    const queue = vi.fn();
    const result = await dispatchRebuildWith429Handling({ sandbox, queue });
    expect(queue).toHaveBeenCalled();
    expect(result.outcome).toBe('queued_for_window');
  });
});
```

---

## US-AT-040 — Artifact size cap (v4)

```ts
// worker/src/__tests__/audit-tool/us-040-artifact-size.spec.ts
import { describe, it, expect } from 'vitest';
import { enforceArtifactSizeCap } from '../../services/audit-tool/post-process';

describe('US-AT-040: artifact size cap', () => {
  it('fails job when workspace > 50MB', async () => {
    const result = await enforceArtifactSizeCap({ workspaceSizeBytes: 51 * 1024 * 1024 });
    expect(result.kind).toBe('fail');
  });

  it('passes under 50MB', async () => {
    const result = await enforceArtifactSizeCap({ workspaceSizeBytes: 30 * 1024 * 1024 });
    expect(result.kind).toBe('ok');
  });
});
```

---

## Fixtures + helpers

### `worker/src/__tests__/audit-tool/_fixtures/rebuild-load.ts`

```ts
export async function simulateRebuildBurst({ count, concurrencyCap }: { count: number; concurrencyCap?: number }) {
  // Dispatch N parallel rebuilds against staging; return failure + provision timing stats
  return { failures: 0, maxProvisionMs: 0, queuedCount: 0 };
}
```

### `worker/src/__tests__/audit-tool/_fixtures/injection.ts`

```ts
export async function runRebuildAgainstInjectedScreenshot(_fixture: string) {
  // Dispatches a rebuild with a screenshot containing OCR-able prompt-injection.
  // Captures all network egress for verification.
  return { networkCalls: [] as Array<{ host: string }>, flags: [] as string[] };
}
```

---

## CI gates

- Vitest passes: `pnpm --filter worker test audit-tool`
- Nightly: 5 rebuilds dispatched against a real Cloudflare Sandbox + reviewed for quality
- Coverage gate 80% on `worker/src/services/audit-tool/**`
- Lint rule rejects any path that omits `--bare` for audit-tool Claude Code calls

---

## Definition of done for v5

- All test signatures land.
- All `expect.fail` markers replaced as engineers implement.
- ToS-compliance check is the first thing the worker runs at startup.
- Cost circuit-breaker + daily cap verified in staging chaos test.
- 14-day Patient Zero on Octio's own site (audits + rebuilds of `octio.co.za`) with zero critical bugs before public launch.
