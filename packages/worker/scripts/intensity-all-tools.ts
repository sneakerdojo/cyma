/**
 * Master intensity runner — exercises ALL 13 chat tools end-to-end.
 *
 * Forces GMAIL_INTERCEPT=1 so action tools record but don't send.
 * Postgres must be reachable for enrich_lead (otherwise that group fails
 * cleanly without affecting others).
 *
 *   cd packages/worker
 *   bun --env-file=.env scripts/intensity-all-tools.ts
 */

process.env.GMAIL_INTERCEPT = '1';

import { runHarness, formatReport, type HarnessReport } from '../tests/tool-harness/runner.js';
import { buildHandoffToHumanHarnessConfig } from '../tests/tool-harness/scenarios/handoff-to-human.js';
import { buildSendResourcesHarnessConfig } from '../tests/tool-harness/scenarios/send-resources.js';
import { buildPrepareCallBriefHarnessConfig } from '../tests/tool-harness/scenarios/prepare-call-brief.js';
import { buildGenerateProjectBlueprintHarnessConfig } from '../tests/tool-harness/scenarios/generate-project-blueprint.js';
import { buildAnswerServiceQuestionHarnessConfig } from '../tests/tool-harness/scenarios/answer-service-question.js';
import { buildShowChoicesHarnessConfig } from '../tests/tool-harness/scenarios/show-choices.js';
import { buildAllShowUiToolHarnessConfigs } from '../tests/tool-harness/scenarios/show-ui-tools.js';
import { buildShowSchedulerHarnessConfig } from '../tests/tool-harness/scenarios/show-scheduler.js';
import {
  buildEnrichLeadHarnessConfig,
  cleanupEnrichLead,
} from '../tests/tool-harness/scenarios/enrich-lead.js';

async function safeRun(
  label: string,
  build: () => ReturnType<typeof buildHandoffToHumanHarnessConfig>,
  cleanup?: () => Promise<void>,
): Promise<HarnessReport | null> {
  try {
    const cfg = build();
    const report = await runHarness(cfg);
    if (cleanup) {
      try {
        await cleanup();
      } catch (cleanupErr) {
        console.warn(
          `cleanup for ${label} failed:`,
          cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
        );
      }
    }
    return report;
  } catch (err) {
    console.log('');
    console.log(`=== ${label} ===`);
    console.log(
      `SKIPPED — ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

async function main(): Promise<void> {
  const reports: HarnessReport[] = [];

  // Order: action tools first (most blast radius), then knowledge, then UI.
  const actionRuns = [
    () => safeRun('handoff_to_human', buildHandoffToHumanHarnessConfig),
    () => safeRun('send_resources', buildSendResourcesHarnessConfig),
    () => safeRun('prepare_call_brief', buildPrepareCallBriefHarnessConfig),
    () =>
      safeRun(
        'generate_project_blueprint',
        buildGenerateProjectBlueprintHarnessConfig,
      ),
    () => safeRun('enrich_lead', buildEnrichLeadHarnessConfig, cleanupEnrichLead),
  ];
  const knowledgeRuns = [
    () =>
      safeRun(
        'answer_service_question',
        buildAnswerServiceQuestionHarnessConfig,
      ),
  ];
  const uiRuns = [
    () => safeRun('show_choices', buildShowChoicesHarnessConfig),
    ...buildAllShowUiToolHarnessConfigs().map(
      (cfg) => async () => {
        try {
          const r = await runHarness(cfg);
          return r;
        } catch (err) {
          console.log('');
          console.log(`=== ${cfg.toolGroup} ===`);
          console.log(`SKIPPED — ${err instanceof Error ? err.message : String(err)}`);
          return null;
        }
      },
    ),
    () => safeRun('show_scheduler', buildShowSchedulerHarnessConfig),
  ];

  for (const run of [...actionRuns, ...knowledgeRuns, ...uiRuns]) {
    const r = await run();
    if (r) {
      reports.push(r);
      console.log(formatReport(r));
    }
  }

  // Aggregate
  const totalPass = reports.reduce((s, r) => s + r.passed, 0);
  const totalFail = reports.reduce((s, r) => s + r.failed, 0);
  const totalScenarios = reports.reduce((s, r) => s + r.records.length, 0);
  const totalIn = reports.reduce((s, r) => s + r.totalTokensIn, 0);
  const totalOut = reports.reduce((s, r) => s + r.totalTokensOut, 0);
  const cost = (totalIn * 1.15 + totalOut * 8.0) / 1_000_000;

  console.log('');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('TOOL INTENSITY FINAL REPORT');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('');
  for (const r of reports) {
    const symbol = r.failed === 0 ? '[✓]' : '[ ]';
    console.log(
      `  ${symbol} ${r.toolGroup.padEnd(32)} ${r.passed}/${r.records.length} pass`,
    );
  }
  console.log('');
  console.log(`  Total: ${totalPass}/${totalScenarios} pass, ${totalFail} fail`);
  console.log(
    `  tokens: ${totalIn} in / ${totalOut} out  (est $${cost.toFixed(4)})`,
  );
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('');

  // Findings section — collect all failed scenarios with reasons
  if (totalFail > 0) {
    console.log('FAILED SCENARIOS — details:');
    for (const r of reports) {
      for (const record of r.records) {
        if (!record.passed) {
          console.log('');
          console.log(`  [${r.toolGroup}] ${record.scenario.name} (${record.scenario.category})`);
          console.log(`    intent: ${record.scenario.intent}`);
          for (const f of record.failures) console.log(`    - ${f}`);
        }
      }
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
