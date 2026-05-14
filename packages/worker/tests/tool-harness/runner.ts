/**
 * Tool intensity harness — runner.
 *
 * Drives a Mastra agent through a list of scenarios, captures every tool
 * invocation, and runs per-scenario + per-tool-call assertions to verify
 * the tool actually did what its description claims.
 *
 * Three scenario categories:
 *   - smoke:        happy path, agent should call the tool with sensible args
 *   - stress:       boundary inputs that exercise edge behaviour
 *   - adversarial:  attacker-shaped inputs (XSS, oversize, CRLF, exfil etc)
 *
 * Used by scripts/intensity/* and tests/tool-harness/scenarios/*.
 */

import type { Agent } from '@mastra/core/agent';
import { runGuard, type GuardSpec } from './guard.js';
import {
  derivePhase,
  activeToolsForPhase,
  type Phase,
} from '../../src/mastra/agents/phase.js';

export type ScenarioCategory = 'smoke' | 'stress' | 'adversarial';

export interface CapturedCall {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  /** Index of the turn in which this call happened (0-based). */
  turn: number;
}

export interface ScenarioRunRecord {
  scenario: Scenario;
  turns: Array<{
    user: string;
    assistantReply: string;
    callsThisTurn: CapturedCall[];
    tokensIn: number;
    tokensOut: number;
    ms: number;
  }>;
  allCalls: CapturedCall[];
  totalTokensIn: number;
  totalTokensOut: number;
  totalMs: number;
  passed: boolean;
  failures: string[];
}

export interface Scenario {
  name: string;
  category: ScenarioCategory;
  /** What this scenario is checking, in one line. Shows up in report. */
  intent: string;
  /** Optional system-message override (added before history). */
  systemHint?: string;
  /** User utterances driven one per turn. */
  turns: string[];
  /** Tools that MUST be called at least once across the scenario. */
  expectTools?: string[];
  /** Tools that MUST NOT be called. */
  forbidTools?: string[];
  /** Per-call assertion: return error message or null to indicate pass. */
  perCallAssertion?: (call: CapturedCall) => string | null;
  /** Whole-scenario assertion run after all turns. */
  finalAssertion?: (record: ScenarioRunRecord) => string | null | Promise<string | null>;
}

export interface HarnessConfig {
  /** Tool group name (e.g. "enrich_lead", "show_choices") for the report header. */
  toolGroup: string;
  /** Factory because each scenario gets a fresh agent (clean call log). */
  buildAgent: (recordCall: (call: CapturedCall) => void) => Agent;
  scenarios: Scenario[];
  /** Per-scenario setup (e.g. clear intercepted emails, seed DB). */
  beforeEach?: (scenario: Scenario) => Promise<void> | void;
  /** Per-scenario teardown. */
  afterEach?: (scenario: Scenario, record: ScenarioRunRecord) => Promise<void> | void;
  /**
   * Optional hallucination guard. When set, the runner inspects each turn's
   * reply for "acknowledge-without-firing" patterns and re-prompts with
   * toolChoice forcing the matching tool. Same pattern as the production
   * voice-agent (src/services/voice-agent/mastra-brain.ts).
   *
   * @deprecated The phase-based state machine (`phaseRouting`) is the
   *   preferred mechanism — it prevents the failure preemptively instead
   *   of reacting to it. Kept for backward compatibility with existing
   *   scenarios. New tools should use phaseRouting.
   */
  guard?: GuardSpec;
  /**
   * Phase-based tool routing. When set, the runner derives the current
   * conversation phase from message history + tool-call history each step,
   * and passes `activeTools` for that phase to `agent.generate()` via
   * `prepareStep`. This matches Retell Conversation Flow / Pipecat Flows
   * / Vapi Squads architecture: scope the tools by state, never let the
   * model see a tool that shouldn't fire in this phase.
   */
  phaseRouting?: {
    enabled: true;
    /** Records phase observed at each step — useful for debugging report. */
    onPhaseObserved?: (phase: Phase, stepNumber: number) => void;
  };
}

export interface HarnessReport {
  toolGroup: string;
  records: ScenarioRunRecord[];
  passed: number;
  failed: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalMs: number;
}

const PRICE_IN_PER_M = 1.15; // Kimi K2 Turbo
const PRICE_OUT_PER_M = 8.0;

export async function runHarness(cfg: HarnessConfig): Promise<HarnessReport> {
  const records: ScenarioRunRecord[] = [];

  for (const scenario of cfg.scenarios) {
    if (cfg.beforeEach) await cfg.beforeEach(scenario);

    const record = await runOne(
      scenario,
      cfg.buildAgent,
      cfg.guard,
      cfg.phaseRouting,
    );
    records.push(record);

    if (cfg.afterEach) await cfg.afterEach(scenario, record);
  }

  const passed = records.filter((r) => r.passed).length;
  const failed = records.length - passed;
  const totalTokensIn = records.reduce((s, r) => s + r.totalTokensIn, 0);
  const totalTokensOut = records.reduce((s, r) => s + r.totalTokensOut, 0);
  const totalMs = records.reduce((s, r) => s + r.totalMs, 0);

  return {
    toolGroup: cfg.toolGroup,
    records,
    passed,
    failed,
    totalTokensIn,
    totalTokensOut,
    totalMs,
  };
}

async function runOne(
  scenario: Scenario,
  buildAgent: HarnessConfig['buildAgent'],
  guard?: GuardSpec,
  phaseRouting?: HarnessConfig['phaseRouting'],
): Promise<ScenarioRunRecord> {
  const calls: CapturedCall[] = [];
  const agent = buildAgent((c) => calls.push(c));

  // prepareStep callback for phase-based routing. Captures the running
  // `calls` array via closure so phase advances as tools fire.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildPrepareStep = (): any => {
    if (!phaseRouting?.enabled) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ({ messages, stepNumber }: { messages: any[]; stepNumber: number }) => {
      const userTurns = messages.filter(
        (m: { role?: string }) => m.role === 'user',
      ).length;
      const lastUser = [...messages]
        .reverse()
        .find((m: { role?: string }) => m.role === 'user');
      const lastUserText = extractMsgText(lastUser);
      const phase = derivePhase({
        userTurnsSoFar: userTurns,
        toolCallHistory: calls.map((c) => ({ name: c.tool })),
        lastUserMessage: lastUserText,
      });
      phaseRouting.onPhaseObserved?.(phase, stepNumber);
      return { activeTools: [...activeToolsForPhase(phase)] };
    };
  };

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  if (scenario.systemHint) {
    messages.push({ role: 'system', content: scenario.systemHint });
  }

  const turns: ScenarioRunRecord['turns'] = [];

  for (let i = 0; i < scenario.turns.length; i++) {
    const userText = scenario.turns[i];
    messages.push({ role: 'user', content: userText });

    const callsBefore = calls.length;
    const start = Date.now();

    let assistantReply = '';
    let tokensIn = 0;
    let tokensOut = 0;
    try {
      const prepareStep = buildPrepareStep();
      const generateOpts = prepareStep
        ? { maxSteps: 3, prepareStep }
        : { maxSteps: 3 };
      const output = await agent.generate(messages, generateOpts);
      assistantReply = output.text ?? '';
      const usage = (output.totalUsage ?? output.usage ?? {}) as {
        inputTokens?: number;
        outputTokens?: number;
        promptTokens?: number;
        completionTokens?: number;
      };
      tokensIn = usage.inputTokens ?? usage.promptTokens ?? 0;
      tokensOut = usage.outputTokens ?? usage.completionTokens ?? 0;
    } catch (err) {
      assistantReply = `[ERROR] ${err instanceof Error ? err.message : String(err)}`;
    }

    // Hallucination guard — must run before history-append since the retry
    // may add tool calls that should be attributed to THIS turn.
    if (guard) {
      const callsThisTurnRaw = calls.slice(callsBefore);
      const guardOutcome = await runGuard({
        guard,
        agent,
        // Pass the conversation history WITHOUT the empty assistant reply
        // — the guard appends its own version inside runGuard.
        messages,
        reply: assistantReply,
        callsThisTurn: callsThisTurnRaw,
        prevCalls: calls.slice(0, callsBefore),
      });
      if (guardOutcome.triggered) {
        if (guardOutcome.newReply) {
          assistantReply = guardOutcome.newReply;
        }
        tokensIn += guardOutcome.retryTokensIn;
        tokensOut += guardOutcome.retryTokensOut;
      }
    }

    const ms = Date.now() - start;
    // Skip pushing empty assistant replies — Moonshot rejects them on next turn.
    messages.push({
      role: 'assistant',
      content: assistantReply.trim() || '(no reply)',
    });

    // Tag captures from this turn with the turn index (guard may have added more).
    const callsThisTurn = calls.slice(callsBefore).map((c) => ({ ...c, turn: i }));
    for (let k = callsBefore; k < calls.length; k++) {
      calls[k] = { ...calls[k], turn: i };
    }

    turns.push({
      user: userText,
      assistantReply,
      callsThisTurn,
      tokensIn,
      tokensOut,
      ms,
    });
  }

  // Score
  const failures: string[] = [];

  if (scenario.expectTools) {
    const fired = new Set(calls.map((c) => c.tool));
    for (const want of scenario.expectTools) {
      if (!fired.has(want)) failures.push(`expected tool ${want} was not called`);
    }
  }
  if (scenario.forbidTools) {
    const fired = new Set(calls.map((c) => c.tool));
    for (const ban of scenario.forbidTools) {
      if (fired.has(ban)) failures.push(`forbidden tool ${ban} was called`);
    }
  }
  if (scenario.perCallAssertion) {
    for (const c of calls) {
      const msg = scenario.perCallAssertion(c);
      if (msg) failures.push(`per-call assertion on ${c.tool} (turn ${c.turn}): ${msg}`);
    }
  }

  const totalTokensIn = turns.reduce((s, t) => s + t.tokensIn, 0);
  const totalTokensOut = turns.reduce((s, t) => s + t.tokensOut, 0);
  const totalMs = turns.reduce((s, t) => s + t.ms, 0);

  const recordPartial: Omit<ScenarioRunRecord, 'passed' | 'failures'> = {
    scenario,
    turns,
    allCalls: calls,
    totalTokensIn,
    totalTokensOut,
    totalMs,
  };

  if (scenario.finalAssertion) {
    const finalMsg = await scenario.finalAssertion({
      ...recordPartial,
      passed: failures.length === 0,
      failures,
    });
    if (finalMsg) failures.push(`final assertion: ${finalMsg}`);
  }

  return {
    ...recordPartial,
    passed: failures.length === 0,
    failures,
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export function formatReport(report: HarnessReport): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(`=== ${report.toolGroup} ===`);
  lines.push(
    `${report.passed}/${report.records.length} passed, ${report.failed} failed`,
  );
  const costUsd =
    (report.totalTokensIn * PRICE_IN_PER_M +
      report.totalTokensOut * PRICE_OUT_PER_M) /
    1_000_000;
  lines.push(
    `tokens: ${report.totalTokensIn} in / ${report.totalTokensOut} out  (est $${costUsd.toFixed(4)})  total brain time: ${report.totalMs}ms`,
  );
  lines.push('');
  for (const r of report.records) {
    const head = `${r.passed ? 'PASS' : 'FAIL'}  [${r.scenario.category}] ${r.scenario.name}`;
    lines.push(head);
    lines.push(`  intent: ${r.scenario.intent}`);
    lines.push(
      `  tools fired: ${[...new Set(r.allCalls.map((c) => c.tool))].join(', ') || '(none)'}`,
    );
    if (r.failures.length > 0) {
      for (const f of r.failures) lines.push(`  - ${f}`);
    }
    for (const t of r.turns) {
      lines.push(`    > ${t.user}`);
      const truncReply = t.assistantReply.replace(/\s+/g, ' ').slice(0, 100);
      const callTags = t.callsThisTurn.length
        ? ` [tools: ${t.callsThisTurn.map((c) => c.tool).join(',')}]`
        : '';
      lines.push(
        `    < ${truncReply}${truncReply.length === 100 ? '...' : ''}${callTags}`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

function extractMsgText(msg: unknown): string {
  if (!msg || typeof msg !== 'object') return '';
  const m = msg as { content?: unknown };
  if (typeof m.content === 'string') return m.content;
  if (Array.isArray(m.content)) {
    return m.content
      .map((p: { type?: string; text?: string }) =>
        p.type === 'text' ? (p.text ?? '') : '',
      )
      .join(' ');
  }
  return '';
}
