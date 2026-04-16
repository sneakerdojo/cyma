import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// show_file_upload — pass-through UI tool
//
// SRP: This tool's only responsibility is to signal the frontend to render
// a file upload zone. The execute function returns the input as-is so the
// SSE stream carries component props to the client.
// ---------------------------------------------------------------------------

export const showFileUploadTool = createTool({
  id: 'show_file_upload',
  description:
    'Show a file upload zone. Call this when asking for specs, mockups, screenshots, or documents. Always include a skip option.',
  inputSchema: z.object({
    question: z.string().describe('Main question text'),
    detail: z.string().optional().describe('Additional context, muted text below question'),
    acceptTypes: z
      .string()
      .default('.pdf,.doc,.docx,.txt,image/*')
      .describe('Comma-separated list of accepted MIME types or file extensions'),
    allowSkip: z.boolean().default(true).describe('Show a skip button below the upload zone'),
  }),
  execute: async (input) => ({ rendered: true, ...input }),
});
