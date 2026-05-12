import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Use a dedicated single-connection client for migrations — not a pool.
// This ensures each migration runs in its own transaction without interference.
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

try {
  console.log('Applying migrations from ./src/db/migrations ...');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('Migrations applied successfully.');
  await sql.end();
  process.exit(0);
} catch (error) {
  console.error('Migration failed:', error);
  await sql.end();
  process.exit(1);
}
