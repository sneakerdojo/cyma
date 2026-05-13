/**
 * Voice Agent service — public entry.
 *
 * v1 surface is the SIMULATOR — runs the orchestrator + mock brain + mock
 * tools end-to-end without telephony. Used by the /voice-sim web page and
 * (eventually) by the live Retell integration once credentials are wired.
 *
 * Spec: docs/superpowers/specs/2026-05-12-voice-agent-superseded.md
 */

export { runTurn } from './orchestrator.js';
export type {
  Brain,
  BrainTurnRequest,
  HistoryMessage,
  LatencyBreakdown,
  RunTurnArgs,
  RunTurnResult,
  SessionState,
  ToolCall,
  ToolCallResult,
  ToolRegistry,
  Turn,
} from './orchestrator.js';

export { createMockBrain } from './mock-brain.js';
export {
  createMockTools,
  mockBookAppointment,
  mockLookupAvailability,
  mockRouteToHuman,
} from './tools.js';

export {
  simulateTurn,
  resetSession,
  getSession,
} from './simulator.js';
export type { SimulateTurnArgs, SimulateTurnResponse } from './simulator.js';
