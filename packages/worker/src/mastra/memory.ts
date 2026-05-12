import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { config } from '../config.js';

/**
 * PostgreSQL storage adapter for Mastra memory.
 *
 * Uses the same DATABASE_URL as the Drizzle client but creates its own
 * pg.Pool — @mastra/pg uses node-postgres (pg) while the Drizzle client
 * uses postgres.js, so the two pools cannot be shared at the object level.
 * Mastra manages its own schema (mastra_threads, mastra_messages, etc.)
 * without touching the application's Drizzle schema.
 */
const pgStore = new PostgresStore({
  id: 'octio-memory-store',
  connectionString: config.databaseUrl,
});

/**
 * Mastra memory instance backed by PostgreSQL.
 *
 * lastMessages: 20 — keeps the last 20 messages in context per thread,
 * preventing unbounded token growth while preserving adequate conversational
 * continuity. Semantic summarization (observationalMemory) requires a vector
 * store + embedder which are out of scope for this task; it can be enabled
 * in a follow-up task once a pgvector extension + embedder are wired.
 */
export const memory = new Memory({
  storage: pgStore,
  options: {
    lastMessages: 20,
  },
});
