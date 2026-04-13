// config must be imported first — it loads dotenv so DATABASE_URL is set
// before db/client.ts reads it at module evaluation time.
import { config } from './config.js';
import { logger } from './logger.js';
import { Hono } from 'hono';
import { bookRoutes } from './routes/book.js';
import { chatRoutes } from './routes/chat.js';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { sql } from 'drizzle-orm';
import { db } from './db/client.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';

const app = new Hono();

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------
app.use(
  '*',
  cors({
    origin: config.allowedOrigins,
    credentials: true,
  }),
);

app.use('*', honoLogger());

// ------------------------------------------------------------------
// Rate limiting
// ------------------------------------------------------------------
// /chat/* — session-and-ip mode: enforces per-session (X-Session-Id header)
//   and per-IP new-session limits. Chat routes are the primary LLM abuse target.
// /api/*  — ip-only mode: only the per-IP new-session limit applies.
//   Booking submissions are naturally self-throttled (calendar event creation).
app.use('/chat/*', rateLimitMiddleware('session-and-ip'));
app.use('/api/*', rateLimitMiddleware('ip-only'));

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------
app.route('/api', bookRoutes);
app.route('/chat', chatRoutes);

app.get('/health', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);

    return c.json({
      status: 'ok',
      db: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof AggregateError && err.errors?.length
        ? err.errors
            .map((e: unknown) => (e instanceof Error ? e.message : String(e)))
            .join('; ')
        : err instanceof Error
          ? err.message || String(err)
          : String(err);

    logger.error({ err }, 'Health check DB ping failed');

    return c.json(
      {
        status: 'degraded',
        db: 'disconnected',
        error: message,
        uptime: process.uptime(),
      },
      503,
    );
  }
});

// ------------------------------------------------------------------
// Server startup
// ------------------------------------------------------------------
const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    logger.info(
      { port: info.port, nodeEnv: config.nodeEnv },
      `Octio worker started on port ${info.port}`,
    );
  },
);

// ------------------------------------------------------------------
// Graceful shutdown
// ------------------------------------------------------------------
function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutdown signal received — closing server');

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
