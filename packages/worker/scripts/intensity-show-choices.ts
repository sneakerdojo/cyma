/**
 * Run intensity scenarios for show_choices (pure pass-through tool).
 *
 *   cd packages/worker
 *   bun --env-file=.env scripts/intensity-show-choices.ts
 */

import { runHarness, formatReport } from '../tests/tool-harness/runner.js';
import { buildShowChoicesHarnessConfig } from '../tests/tool-harness/scenarios/show-choices.js';

async function main(): Promise<void> {
  const report = await runHarness(buildShowChoicesHarnessConfig());
  console.log(formatReport(report));
  if (report.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
