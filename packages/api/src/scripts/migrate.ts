/**
 * Database migration runner.
 *
 * Reads numbered SQL files from the monorepo `migrations/` directory,
 * applies any that haven't been run yet (tracked in the `_migrations` table),
 * then runs `seed.sql` (always idempotent).
 *
 * Can be used in two ways:
 *   1. Imported:  import { migrate } from "./scripts/migrate.js";
 *   2. Standalone: pnpm tsx src/scripts/migrate.ts
 */

import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../db/init.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, "../../../../migrations");

async function ensureMigrationsTable(): Promise<void> {
  const sql = readFileSync(
    resolve(migrationsDir, "000_create_migrations_table.sql"),
    "utf-8"
  );
  console.log("[migrate] Ensuring _migrations table...");
  const result = await pool.query(sql);
  console.log("[migrate] _migrations table ready");
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const res = await pool.query<{ name: string }>(
    "SELECT name FROM _migrations ORDER BY id"
  );
  return new Set(res.rows.map((r) => r.name));
}

function getMigrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort();
}

export async function migrate(): Promise<void> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = getMigrationFiles();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("[migrate] Schema is up to date — no pending migrations.");
  } else {
    console.log(`[migrate] Found ${files.length} total migration files: ${files.join(", ")}`);
    console.log(`[migrate] Already applied: ${Array.from(applied).join(", ") || "(none)"}`);
    console.log(`[migrate] ${pending.length} pending migration(s): ${pending.join(", ")}`);

    for (const file of pending) {
      const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO _migrations (name) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`[migrate]   ✔ ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`[migrate]   ✘ ${file} — rolled back`);
        throw err;
      } finally {
        client.release();
      }
    }
  }

  // Always run seed (idempotent via ON CONFLICT DO NOTHING)
  // Set app.env so seed.sql can skip dev-only rows in production.
  // Use set_config() with a parameter to avoid any injection risk.
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const seedPath = resolve(migrationsDir, "seed.sql");
  const seedSql = readFileSync(seedPath, "utf-8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.env', $1, true)", [nodeEnv]);
    await client.query(seedSql);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  console.log("[migrate] Seed data applied.");
}

// Run standalone: pnpm tsx src/scripts/migrate.ts
const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  migrate()
    .then(() => {
      console.log("[migrate] Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[migrate] Failed:", err);
      process.exit(1);
    });
}
