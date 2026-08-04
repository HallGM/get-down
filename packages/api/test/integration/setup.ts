/**
 * Testcontainers-Postgres harness for integration tests.
 *
 * Starts a real Postgres container, applies every migration in `migrations/`
 * in order (the same migration runner used in production), then hands back a
 * `pg` Pool. Tests use `resetDatabase()` between test cases instead of
 * tearing the container down — container startup dominates test runtime
 * otherwise.
 *
 * IMPORTANT: `process.env.DATABASE_URL` must be set BEFORE importing
 * "../../src/db/init.js" (or anything that imports it), because that module
 * constructs its connection pool at import time. `startDatabase()` sets the
 * env var and returns a dynamically-imported `pool`/`run_query` so callers
 * never import db/init.js directly at the top of a test file.
 */
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, "../../../../migrations");

let container: StartedPostgreSqlContainer | undefined;

export interface IntegrationDb {
  pool: import("pg").Pool;
  run_query: typeof import("../../src/db/init.js").run_query;
  withTransaction: typeof import("../../src/db/init.js").withTransaction;
}

/**
 * Starts (once per test file/worker) a Postgres container, points the app's
 * DB layer at it via DATABASE_URL, and applies every migration + seed.
 * Returns the app's own `pool`/`run_query`/`withTransaction` so tests exercise
 * the exact same DB layer as production, not a re-implementation.
 */
export async function startDatabase(): Promise<IntegrationDb> {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.SKIP_MIGRATION = "true"; // this harness runs migrations itself
  process.env.NODE_ENV = "test";

  const db = await import("../../src/db/init.js");
  await applyMigrations(db.pool);
  return db;
}

export async function stopDatabase(): Promise<void> {
  const db = await import("../../src/db/init.js");
  // End the pool gracefully BEFORE stopping the container. Killing the
  // container out from under an open pool triggers the production
  // `pool.on("error", ...) => process.exit(-1)` handler in db/init.ts, which
  // would crash the whole Jest worker mid-teardown.
  await db.pool.end().catch(() => undefined);
  if (container) await container.stop();
}

/**
 * Deletes all rows from every table (except _migrations) between tests so
 * each test starts from a clean slate without paying container-startup cost
 * again. Uses TRUNCATE ... CASCADE, restarting identity sequences so ids are
 * predictable across tests.
 */
export async function resetDatabase(pool: import("pg").Pool): Promise<void> {
  const { rows } = await pool.query<{ tablename: string }>(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT IN ('_migrations');
  `);
  if (rows.length === 0) return;
  const tables = rows.map((r) => `"${r.tablename.replace(/"/g, '""')}"`).join(", ");
  await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE;`);
  // Re-seed the singleton business account and dev user that migrations expect to exist.
  await pool.query(`
    INSERT INTO accounts (is_business) VALUES (true)
    ON CONFLICT (is_business) WHERE is_business = true DO NOTHING;
  `);
}

async function applyMigrations(pool: import("pg").Pool): Promise<void> {
  const files = readdirSync(migrationsDir)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort();
  for (const file of files) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
    await pool.query(sql);
  }
  await pool.query(`SELECT set_config('app.env', 'test', true);`);
  const seedSql = readFileSync(resolve(migrationsDir, "seed.sql"), "utf-8");
  await pool.query(seedSql);
}
