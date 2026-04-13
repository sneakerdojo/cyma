import { describe, it, expect } from 'vitest';
import { answerServiceQuestionTool } from './answer-service-question.js';

// ---------------------------------------------------------------------------
// The tool reads services.json from the filesystem at execute time.
// Because the knowledge file is a static fixture committed to the repo,
// no mocking is needed — we exercise the real file, which also validates
// the JSON is valid and the keys match expectations.
// ---------------------------------------------------------------------------

describe('answerServiceQuestionTool', () => {
  it('returns the AI Agents entry for known topic "ai-agents"', async () => {
    const result = await answerServiceQuestionTool.execute!(
      { topic: 'ai-agents' },
      {} as never,
    );

    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).title).toBe('AI Agents & Automations');
    expect((result as Record<string, unknown>).summary).toContain('Claude');
    expect((result as Record<string, unknown>).technologies).toContain('Mastra');
  });

  it('returns the pricing entry with ZAR note for known topic "pricing"', async () => {
    const result = await answerServiceQuestionTool.execute!(
      { topic: 'pricing' },
      {} as never,
    );

    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).title).toBe('Pricing');
    expect((result as Record<string, unknown>).note).toContain('ZAR');
    expect((result as Record<string, unknown>).summary).toContain('R50K');
  });

  it('falls back to the "general" entry for an unknown topic', async () => {
    const result = await answerServiceQuestionTool.execute!(
      { topic: 'quantum-computing' },
      {} as never,
    );

    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).title).toBe('About Octio');
    expect((result as Record<string, unknown>).summary).toContain('Pretoria');
  });
});
