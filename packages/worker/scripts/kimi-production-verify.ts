/**
 * Production verification — drives mastra-brain.ts (the actual production
 * module) through the same scenarios the test harness exercises, but using
 * the real exported API. If this passes, /api/voice-agent/turn will behave
 * the same way when VOICE_USE_REAL_BRAIN=1.
 *
 * Difference from kimi-tool-reliability-test.ts: that script has the
 * Mastra+Kimi+guard logic inlined. This one consumes the same logic via
 * createMastraVoiceBrain(...). Catches regressions in the production wiring
 * (history conversion, session state derivation, tool-impl injection) that
 * the inline version doesn't.
 *
 * Run:
 *   cd packages/worker
 *   bun --env-file=.env scripts/kimi-production-verify.ts
 */

import { createMastraVoiceBrain } from '../src/services/voice-agent/mastra-brain.js';
import {
  mockLookupAvailability,
  mockBookAppointment,
  mockRouteToHuman,
} from '../src/services/voice-agent/tools.js';
import type { SessionState } from '../src/services/voice-agent/orchestrator.js';

const KIMI_API_KEY = process.env.KIMI_API_KEY;
if (!KIMI_API_KEY) {
  console.error('KIMI_API_KEY is not set. Set it in worker/.env.');
  process.exit(1);
}

const brain = createMastraVoiceBrain({
  tenantBrand: 'Joburg Plumbing',
  llm: {
    apiKey: KIMI_API_KEY,
    baseUrl: process.env.KIMI_BASE_URL,
    model: process.env.KIMI_MODEL,
  },
  toolImpls: {
    lookupAvailability: (a) => mockLookupAvailability(a),
    bookAppointment: (a) => mockBookAppointment(a),
    routeToHuman: (a) => mockRouteToHuman(a),
  },
});

interface Scenario {
  name: string;
  turns: string[];
  expectBookedSlot: boolean;
  expectEnded: boolean;
}

const SCENARIOS: Scenario[] = [
  {
    name: 'happy_path_booking',
    turns: [
      'Hi, my kitchen tap has been leaking for a couple days.',
      'It can wait, I am just planning ahead.',
      'I am in Sandton.',
      'Tomorrow morning works.',
      'The 10am slot please.',
    ],
    expectBookedSlot: true,
    expectEnded: false,
  },
  {
    name: 'emergency_burst_geyser',
    turns: ['Hi, my geyser just burst and water is everywhere!'],
    expectBookedSlot: false,
    expectEnded: true,
  },
  {
    name: 'short_affirmative_close',
    turns: [
      'Hi, my outside tap drips.',
      'Whenever, not urgent.',
      'Randburg.',
      'tomorrow is fine.',
      '10am.',
    ],
    expectBookedSlot: true,
    expectEnded: false,
  },
];

async function runScenario(s: Scenario): Promise<{
  passed: boolean;
  failures: string[];
  totalGuardRetries: number;
  totalMs: number;
  bookedSlot: string | null;
  ended: boolean;
}> {
  let state: SessionState = {
    sessionId: `verify-${s.name}-${Date.now()}`,
    tenantId: 1,
    callerNumber: null,
    history: [],
    bookedSlot: null,
  };
  let totalGuardRetries = 0;
  let totalMs = 0;

  for (const transcript of s.turns) {
    const outcome = await brain.runTurn({
      sessionState: state,
      transcript,
    });
    state = outcome.nextState;
    totalGuardRetries += outcome.guardRetries;
    totalMs += outcome.latencyMs.brain;
  }

  const failures: string[] = [];
  if (s.expectBookedSlot && !state.bookedSlot) {
    failures.push('expected bookedSlot to be set, but it is null');
  }
  if (!s.expectBookedSlot && state.bookedSlot) {
    failures.push(`expected no booking, but bookedSlot=${state.bookedSlot}`);
  }
  if (s.expectEnded && !state.ended) {
    failures.push('expected session to be ended (transfer), but it is not');
  }
  if (!s.expectEnded && state.ended) {
    failures.push(`expected session to continue, but ended (${state.endedReason})`);
  }
  if (state.bookedSlot && !/^\d{4}-\d{2}-\d{2}T/.test(state.bookedSlot)) {
    failures.push(`bookedSlot is not ISO-shaped: ${state.bookedSlot}`);
  }

  return {
    passed: failures.length === 0,
    failures,
    totalGuardRetries,
    totalMs,
    bookedSlot: state.bookedSlot,
    ended: state.ended === true,
  };
}

async function main(): Promise<void> {
  console.log('=== Voice-agent production verify ===');
  console.log(`Model: ${process.env.KIMI_MODEL ?? 'kimi-k2-turbo-preview'}`);
  console.log('');

  let allPass = true;
  for (const s of SCENARIOS) {
    process.stdout.write(`  ${s.name} ... `);
    const r = await runScenario(s);
    if (r.passed) {
      console.log(
        `PASS  (guardRetries=${r.totalGuardRetries}, brain=${r.totalMs}ms, bookedSlot=${
          r.bookedSlot ?? 'null'
        }, ended=${r.ended})`,
      );
    } else {
      allPass = false;
      console.log('FAIL');
      for (const f of r.failures) console.log(`    - ${f}`);
      console.log(
        `    debug: guardRetries=${r.totalGuardRetries}, brain=${r.totalMs}ms, bookedSlot=${
          r.bookedSlot ?? 'null'
        }, ended=${r.ended}`,
      );
    }
  }
  console.log('');
  if (!allPass) process.exitCode = 1;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
