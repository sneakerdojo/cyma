/**
 * OctoBrainAdapter — the seam between the voice-agent orchestrator's Brain
 * interface and whatever actually runs the chat underneath.
 *
 * v0: underlying is the mockBrain (deterministic FSM).
 * v1: underlying becomes a real Mastra Octo agent wrapper.
 *
 * Adapter responsibilities:
 *   - Hard timeout so a hung underlying brain can't stall a voice turn.
 *   - Optional system-hint prefix (tenant brand, profile summary) passed
 *     to the underlying brain transparently.
 *   - Idempotent: re-wrapping doesn't add latency.
 */

import type { Brain, BrainTurnRequest, Turn } from './orchestrator.js';

const ADAPTER_NAME = 'octo-brain-adapter';
const DEFAULT_TIMEOUT_MS = 8_000;

const TIMEOUT_REPLY =
  "I'm having a connection issue — give me a moment and try again.";

export interface OctoBrainAdapterArgs {
  underlying: Brain;
  tenantBrand?: string;
  profileSummary?: string;
  timeoutMs?: number;
}

export function createOctoBrainAdapter(args: OctoBrainAdapterArgs): Brain {
  // Idempotent re-wrap: if the underlying is already an adapter, just return
  // it. Prevents accumulating timeout layers + system-hint prefixes.
  if (args.underlying.name === ADAPTER_NAME) {
    return args.underlying;
  }

  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    name: ADAPTER_NAME,
    async generate(req: BrainTurnRequest): Promise<Turn> {
      const systemHints = buildSystemHints(
        req.systemHints,
        args.tenantBrand,
        args.profileSummary,
      );

      const enriched: BrainTurnRequest = {
        history: req.history,
        ...(systemHints ? { systemHints } : {}),
      };

      const generation = args.underlying.generate(enriched);

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<Turn>((resolve) => {
        timer = setTimeout(
          () => resolve({ reply: TIMEOUT_REPLY, toolCalls: [] }),
          timeoutMs,
        );
      });

      try {
        return await Promise.race([generation, timeout]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}

function buildSystemHints(
  existing: string | undefined,
  tenantBrand: string | undefined,
  profileSummary: string | undefined,
): string | undefined {
  const parts: string[] = [];
  if (tenantBrand) parts.push(`Tenant: ${tenantBrand}`);
  if (profileSummary) parts.push(`About the caller: ${profileSummary}`);
  if (existing) parts.push(existing);
  return parts.length === 0 ? undefined : parts.join('\n');
}
