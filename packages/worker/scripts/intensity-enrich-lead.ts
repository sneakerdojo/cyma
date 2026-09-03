/**
 * Run intensity scenarios for enrich_lead and report.
 *
 * Real DB writes happen — cleanup runs at the end whether the scenarios
 * passed or failed. Run with the worker's .env so DATABASE_URL and
 * KIMI_API_KEY resolve.
 *
 *   cd packages/worker
 *   bun --env-file=.env scripts/intensity-enrich-lead.ts
 */

import { runHarness, formatReport } from '../tests/tool-harness/runner.js';
import {
  buildEnrichLeadHarnessConfig,
  cleanupEnrichLead,
} from '../tests/tool-harness/scenarios/enrich-lead.js';

async function main(): Promise<void> {
  const cfg = buildEnrichLeadHarnessConfig();
  let report;
  try {
    report = await runHarness(cfg);
  } finally {
    // Always clean up — even on exception, real DB rows must not linger.
    try {
      await cleanupEnrichLead();
    } catch (cleanupErr) {
      console.error('cleanup failed:', cleanupErr);
    }
  }
  console.log(formatReport(report));
  if (report.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
