import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// postgres.js connection — pool-friendly for long-running server processes.
// max: 10 keeps connection count conservative for a single-VPS deployment.
const sql = postgres(connectionString, { max: 10 });

export const db = drizzle(sql, { schema });

export { schema };
