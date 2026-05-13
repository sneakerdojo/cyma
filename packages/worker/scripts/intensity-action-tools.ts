/**
 * Run intensity scenarios for the 3 email-action tools:
 *   send_resources, handoff_to_human, prepare_call_brief
 *
 * Forces GMAIL_INTERCEPT=1 so no real email goes out. Set DATABASE_URL
 * to something valid even if unused — config validation requires it for
 * any code path that imports the worker's services.
 *
 *   cd packages/worker
 *   bun --env-file=.env scripts/intensity-action-tools.ts
 */

process.env.GMAIL_INTERCEPT = '1';

import { runHarness, formatReport } from '../tests/tool-harness/runner.js';
import { buildHandoffToHumanHarnessConfig } from '../tests/tool-harness/scenarios/handoff-to-human.js';
import { buildSendResourcesHarnessConfig } from '../tests/tool-harness/scenarios/send-resources.js';
import { buildPrepareCallBriefHarnessConfig } from '../tests/tool-harness/scenarios/prepare-call-brief.js';

async function main(): Promise<void> {
  const configs = [
    buildHandoffToHumanHarnessConfig(),
    buildSendResourcesHarnessConfig(),
    buildPrepareCallBriefHarnessConfig(),
  ];

  let totalFail = 0;
  let totalPass = 0;
  let totalIn = 0;
  let totalOut = 0;
  for (const cfg of configs) {
    const report = await runHarness(cfg);
    console.log(formatReport(report));
    totalPass += report.passed;
    totalFail += report.failed;
    totalIn += report.totalTokensIn;
    totalOut += report.totalTokensOut;
  }

  const costUsd = (totalIn * 1.15 + totalOut * 8.0) / 1_000_000;
  console.log('');
  console.log('═════════════════════════════════════════════════');
  console.log(`ACTION TOOLS OVERALL: ${totalPass} passed / ${totalFail} failed`);
  console.log(
    `tokens: ${totalIn} in / ${totalOut} out  (est $${costUsd.toFixed(4)})`,
  );
  console.log('═════════════════════════════════════════════════');
  if (totalFail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
