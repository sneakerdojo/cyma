/**
 * Run intensity scenarios for the knowledge tool + 5 pure pass-through UI tools.
 *
 *   cd packages/worker
 *   bun --env-file=.env scripts/intensity-knowledge-ui-tools.ts
 */

process.env.GMAIL_INTERCEPT = '1';

import { runHarness, formatReport } from '../tests/tool-harness/runner.js';
import { buildAnswerServiceQuestionHarnessConfig } from '../tests/tool-harness/scenarios/answer-service-question.js';
import { buildShowChoicesHarnessConfig } from '../tests/tool-harness/scenarios/show-choices.js';
import { buildAllShowUiToolHarnessConfigs } from '../tests/tool-harness/scenarios/show-ui-tools.js';

async function main(): Promise<void> {
  const configs = [
    buildAnswerServiceQuestionHarnessConfig(),
    buildShowChoicesHarnessConfig(),
    ...buildAllShowUiToolHarnessConfigs(),
  ];

  let totalPass = 0;
  let totalFail = 0;
  let totalIn = 0;
  let totalOut = 0;
  for (const cfg of configs) {
    const r = await runHarness(cfg);
    console.log(formatReport(r));
    totalPass += r.passed;
    totalFail += r.failed;
    totalIn += r.totalTokensIn;
    totalOut += r.totalTokensOut;
  }

  const cost = (totalIn * 1.15 + totalOut * 8.0) / 1_000_000;
  console.log('');
  console.log('═════════════════════════════════════════════════');
  console.log(`KNOWLEDGE + UI TOOLS OVERALL: ${totalPass} passed / ${totalFail} failed`);
  console.log(`tokens: ${totalIn} in / ${totalOut} out  (est $${cost.toFixed(4)})`);
  console.log('═════════════════════════════════════════════════');
  if (totalFail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
