/**
 * Conversation phase state machine for the Octo qualifying agent.
 *
 * Industry standard pattern (Retell Conversation Flow, Pipecat Flows, Vapi
 * Squads, OpenAI Agents SDK handoffs): decompose a multi-turn conversation
 * into discrete phases and expose only the tools relevant to the current
 * phase. Single-prompt + all-tools is the documented losing pattern
 * (GPT-4o multi-turn BFCL: 50%; see Daily.co Jun 2025 voice-AI advice).
 *
 * Phase is derived from message + tool-call history each call — there is
 * no separate phase storage. The derivation is deterministic so a fresh
 * conversation lands in the same phase as a replay.
 *
 * See docs/session-notes/tool-intensity-findings-2026-05-13.md for the
 * research synthesis that motivated this design.
 */

export type Phase = 'cold' | 'discovery' | 'qualify' | 'close' | 'book';

/**
 * Per-phase tool whitelist. The agent's `activeTools` is set to this list
 * each step via `prepareStep`, so the model literally cannot pick a tool
 * outside its current phase.
 *
 * Universal tools (handoff_to_human, answer_service_question) appear in
 * every phase since the user can always ask for a human or service info.
 */
const UNIVERSAL_TOOLS = [
  'answer_service_question',
  'handoff_to_human',
  'show_diagram',
  'show_text_input',
] as const;

export const TOOLS_BY_PHASE: Record<Phase, readonly string[]> = {
  cold: [...UNIVERSAL_TOOLS, 'show_choices'],
  discovery: [
    ...UNIVERSAL_TOOLS,
    'show_choices',
    'show_multi_select',
    'show_file_upload',
  ],
  qualify: [
    ...UNIVERSAL_TOOLS,
    'enrich_lead',
    'show_form',
    'show_choices',
    'show_multi_select',
  ],
  // Close phase does NOT include generate_project_blueprint by product
  // decision (2026-05-14) — the blueprint is generated as part of post-
  // discovery-call analysis, not during the conversation. The tool still
  // exists for off-line use by the follow-up pipeline.
  close: [
    ...UNIVERSAL_TOOLS,
    'prepare_call_brief',
    'send_resources',
    'show_choices',
  ],
  book: [...UNIVERSAL_TOOLS, 'show_scheduler', 'show_form'],
};

// ---------------------------------------------------------------------------
// Phase derivation
// ---------------------------------------------------------------------------

export interface PhaseDerivationInput {
  /** Number of user messages so far in the conversation. */
  userTurnsSoFar: number;
  /** Tools called across the entire conversation. */
  toolCallHistory: ReadonlyArray<{ name: string }>;
  /** Most recent user message text (for keyword-based phase nudges). */
  lastUserMessage?: string;
}

/**
 * Derive the current phase from conversation state.
 *
 * Edge conditions (Retell-style deterministic state transitions):
 *   - cold:      no user turns yet, or first turn only with no tool calls
 *   - discovery: caller has talked but no qualifying data captured yet
 *   - qualify:   enrich_lead has fired at least once, fewer than 3 dimensions
 *   - close:     3+ qualifying dimensions captured, or user signals close
 *   - book:      caller has accepted a booking next step (asked to schedule)
 */
export function derivePhase(input: PhaseDerivationInput): Phase {
  const { userTurnsSoFar, toolCallHistory, lastUserMessage = '' } = input;

  // Keyword signals for booking intent — strong override.
  const bookingIntent =
    /\b(?:book(?:ing)?|schedule|set up (?:a |the )?(?:call|meeting)|available times?|when (?:can|are) (?:we|you))\b/i.test(
      lastUserMessage,
    );

  // Closing signals — also a strong override.
  const closingSignal =
    /\b(?:thanks|that's all|goodbye|talk later|wrap up|send (?:me )?(?:the )?(?:blueprint|brief|proposal|case stud)|email me)\b/i.test(
      lastUserMessage,
    );

  // Contact-capture intent — user wants to be added / contacted / signed up.
  // Skips ahead to qualify phase so the deterministic show_form fires (see
  // forcedToolForPhase). This is the Retell "function node" pattern — when
  // we know exactly what side-effect should fire, we don't let the LLM
  // decide whether to fire it.
  const contactCaptureIntent =
    /\b(?:(?:add|sign) me (?:to|up|in)|(?:put|get) me on (?:the |your )?list|discovery call list|i (?:want|would like) to (?:be )?(?:added|contacted|on)|reach out (?:to me|when)|get in touch)\b/i.test(
      lastUserMessage,
    );

  // Cold: no messages yet, or very first message with no tool calls AND
  // no strong intent signal.
  if (userTurnsSoFar === 0) return 'cold';
  if (
    userTurnsSoFar === 1 &&
    toolCallHistory.length === 0 &&
    !contactCaptureIntent &&
    !bookingIntent
  ) {
    return 'cold';
  }

  // Contact-capture intent jumps straight to qualify so show_form fires.
  if (contactCaptureIntent) return 'qualify';

  // Booking phase overrides everything else (caller explicitly wants to book).
  if (bookingIntent) return 'book';

  // Count qualifying dimensions captured via enrich_lead.
  const enrichCalls = toolCallHistory.filter((c) => c.name === 'enrich_lead');
  const showSchedulerCalls = toolCallHistory.filter(
    (c) => c.name === 'show_scheduler',
  );

  // Once scheduler has been shown, we're in booking phase.
  if (showSchedulerCalls.length > 0) return 'book';

  // Closing signal pushes us to close phase from qualify/discovery.
  if (closingSignal && enrichCalls.length >= 1) return 'close';

  // Enough qualifying data captured → close phase.
  if (enrichCalls.length >= 3) return 'close';

  // Some qualifying data captured → qualify phase.
  if (enrichCalls.length >= 1) return 'qualify';

  // Default: still discovering.
  return 'discovery';
}

/**
 * Convenience helper: given a current phase, return the activeTools list
 * to pass into Mastra's `prepareStep`.
 */
export function activeToolsForPhase(phase: Phase): readonly string[] {
  return TOOLS_BY_PHASE[phase];
}

/**
 * Deterministic forced-tool decision for a phase transition.
 *
 * Implements the Retell "function node" / Pipecat Flows "function call"
 * pattern: at known phase transitions, deterministically force the tool
 * that captures the data needed to advance the conversation. The LLM
 * gets no say in whether it fires — `toolChoice` makes the call mandatory.
 *
 * Current rule:
 *   - On entry to `qualify` phase, if we haven't yet captured contact info
 *     (no prior show_form call), force `show_form`. This lets us look up
 *     or create a profile early, so all subsequent turns can personalise
 *     using captured name/email/company.
 *
 * Returns the tool name to force, or undefined for "no force, let auto
 * tool selection apply".
 */
export function forcedToolForPhase(
  phase: Phase,
  toolCallHistory: ReadonlyArray<{ name: string }>,
): string | undefined {
  const haveContactCapture = toolCallHistory.some(
    (c) => c.name === 'show_form',
  );

  // Qualify-phase entry: force show_form if we don't have contact info yet.
  // Profile-personalisation requires identity capture — this is the
  // deterministic entry to the qualify state.
  if (phase === 'qualify' && !haveContactCapture) {
    return 'show_form';
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Mastra integration helpers
// ---------------------------------------------------------------------------

/**
 * Build a `prepareStep` callback for Mastra's `agent.generate()` /
 * `agent.stream()`. The callback re-derives phase each step (i.e. each
 * tool-call loop iteration) using accumulated tool calls.
 *
 * `getToolCallHistory` is injected so the caller decides where the history
 * lives (in-memory session store, DB, or derived from message list).
 */
export function buildPhasePrepareStep(args: {
  getToolCallHistory: () => ReadonlyArray<{ name: string }>;
}): (ctx: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[];
  stepNumber: number;
}) => { activeTools: readonly string[]; phase: Phase } {
  return ({ messages }) => {
    const userTurns = messages.filter(
      (m: { role?: string }) => m.role === 'user',
    ).length;
    const lastUser = [...messages]
      .reverse()
      .find((m: { role?: string }) => m.role === 'user');
    const lastUserText = extractText(lastUser);

    const phase = derivePhase({
      userTurnsSoFar: userTurns,
      toolCallHistory: args.getToolCallHistory(),
      lastUserMessage: lastUserText,
    });

    return {
      activeTools: activeToolsForPhase(phase),
      phase,
    };
  };
}

function extractText(msg: unknown): string {
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
