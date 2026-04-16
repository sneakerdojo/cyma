import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  port: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 3000)),
  nodeEnv: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  databaseUrl: z.string({
    required_error:
      'DATABASE_URL is required. Set it in worker/.env or as an environment variable.',
  }),
  allowedOrigins: z
    .string()
    .optional()
    .transform((val) => {
      if (val) {
        return val.split(',').map((s) => s.trim());
      }
      const nodeEnv = process.env.NODE_ENV;
      return nodeEnv === 'production'
        ? ['https://octio.co.za', 'https://www.octio.co.za']
        : [
            'http://localhost:5173',
            'http://localhost:3000',
            'https://octio.co.za',
            'https://www.octio.co.za',
          ];
    }),
  anthropicApiKey: z.string().optional(),
  kimiApiKey: z.string().optional(),
  kimiBaseUrl: z.string().optional(),
  kimiModel: z.string().optional(),
  llmProvider: z.enum(['kimi', 'anthropic']).optional(),
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  googleRefreshToken: z.string().optional(),
  googleSenderEmail: z.string().optional(),
  octioTeamEmail: z.string().optional(),
  leadsGroupEmail: z.string().email().optional().default('leads@octio.co.za'),
  outreachGroupEmail: z.string().email().optional().default('outreach@octio.co.za'),
  uploadDir: z
    .string()
    .optional()
    .transform((val) =>
      val ??
      (process.env.NODE_ENV === 'production'
        ? '/var/octio/uploads'
        : './uploads'),
    ),
  uploadPublicUrlBase: z
    .string()
    .optional()
    .transform((val) =>
      val ??
      (process.env.NODE_ENV === 'production'
        ? 'https://octio.co.za/uploads'
        : 'http://localhost:3000/uploads'),
    ),
});

const parsed = configSchema.safeParse({
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  databaseUrl: process.env.DATABASE_URL,
  allowedOrigins: process.env.ALLOWED_ORIGINS,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  kimiApiKey: process.env.KIMI_API_KEY,
  kimiBaseUrl: process.env.KIMI_BASE_URL,
  kimiModel: process.env.KIMI_MODEL,
  // Auto-detect provider: if LLM_PROVIDER is not set, default to 'kimi' when
  // KIMI_API_KEY is present, otherwise fall back to 'anthropic'.
  llmProvider:
    process.env.LLM_PROVIDER ??
    (process.env.KIMI_API_KEY ? 'kimi' : 'anthropic'),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  googleSenderEmail: process.env.GOOGLE_SENDER_EMAIL,
  octioTeamEmail: process.env.OCTIO_TEAM_EMAIL,
  leadsGroupEmail: process.env.LEADS_GROUP_EMAIL,
  outreachGroupEmail: process.env.OUTREACH_GROUP_EMAIL,
  uploadDir: process.env.UPLOAD_DIR,
  uploadPublicUrlBase: process.env.UPLOAD_PUBLIC_URL_BASE,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Config validation failed:\n${issues}`);
}

export const config = parsed.data;
