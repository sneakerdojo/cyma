/**
 * Quick test: does generateObject work with Kimi (Moonshot)?
 * Run: tsx --env-file .env scripts/test-generate-object.ts
 */
import { generateObject, generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';

const kimi = createOpenAICompatible({
  name: 'kimi',
  baseURL: process.env.KIMI_BASE_URL || 'https://api.moonshot.ai/v1',
  apiKey: process.env.KIMI_API_KEY!,
});

const model = kimi.chatModel(process.env.KIMI_MODEL || 'kimi-k2-0905-preview');

const schema = z.object({
  title: z.string(),
  detail: z.string(),
  options: z.array(z.string()).min(3).max(5),
});

async function testGenerateObject() {
  console.log('Testing generateObject with Kimi...');
  try {
    const result = await generateObject({
      model,
      schema,
      prompt:
        'Generate a question asking what main problem the user wants to solve. Include 4 specific options.',
    });
    console.log('generateObject SUCCESS:');
    console.log(JSON.stringify(result.object, null, 2));
    return true;
  } catch (err) {
    console.error('generateObject FAILED:', (err as Error).message);
    return false;
  }
}

async function testGenerateText() {
  console.log('\nTesting generateText + JSON parse fallback...');
  try {
    const { text } = await generateText({
      model,
      system:
        'Respond ONLY with valid JSON. No markdown fences, no explanation, just raw JSON.',
      prompt:
        'Generate JSON matching exactly: { "title": "string", "detail": "string", "options": ["string", "string", "string", "string"] }. The question should ask what main problem the user wants to solve in the context of business software.',
    });

    console.log('Raw response:', text.slice(0, 300));

    const parsed = JSON.parse(text);
    const validated = schema.safeParse(parsed);
    if (validated.success) {
      console.log('generateText + JSON parse SUCCESS:');
      console.log(JSON.stringify(validated.data, null, 2));
      return true;
    } else {
      console.error('Zod validation failed:', validated.error.message);
      return false;
    }
  } catch (err) {
    console.error('generateText fallback FAILED:', (err as Error).message);
    return false;
  }
}

const objOk = await testGenerateObject();
if (!objOk) {
  await testGenerateText();
}
