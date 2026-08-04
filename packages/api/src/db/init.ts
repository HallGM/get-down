import { AsyncLocalStorage } from "async_hooks";
import Pg, { type PoolClient, type QueryConfig } from "pg";
import dotenv from "dotenv";

const { Pool: PoolConstructor } = Pg;

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME || "get_down";

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const pool = new PoolConstructor(
  connectionString
    ? { connectionString, ssl: sslConfigFor(connectionString) }
    : { user: dbUser, host: dbHost, database: dbName, password: dbPassword, port: dbPort, ssl: sslConfigFor(dbHost) }
);

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

/**
 * True when a connection string points at a local Postgres instance (dev
 * docker-compose or a Testcontainers-Postgres instance used by integration
 * tests), neither of which support SSL. Remote databases (e.g. Render) do,
 * and need it for the connection to be accepted.
 */
function isLocalConnection(hostOrUrl: string | undefined): boolean {
  if (!hostOrUrl) return false;
  try {
    // Accepts either a bare hostname (DB_HOST, possibly with :port) or a full
    // connection string (DATABASE_URL) — try parsing as a URL first, then fall
    // back to stripping port and normalizing IPv6 bracketed forms.
    let host: string;
    if (hostOrUrl.includes("://")) {
      host = new URL(hostOrUrl).hostname;
    } else {
      // Strip port suffix (e.g. "localhost:5432" → "localhost") and remove
      // IPv6 brackets (e.g. "[::1]" → "::1").
      host = hostOrUrl.replace(/\[?([^\]:]+)\]?(:\d+)?$/, "$1");
    }
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "host.docker.internal";
  } catch (err) {
    // Could not parse connection string; treat as non-local (safe default).
    return false;
  }
}

/**
 * Determines the `ssl` option for the pg Pool given either a `DATABASE_URL`
 * connection string or a bare `DB_HOST` value.
 *
 * - Local connections (docker-compose, Testcontainers) get `ssl: false` — local
 *   Postgres does not support TLS at all.
 * - Every other connection defaults to `rejectUnauthorized: true` — full
 *   certificate verification. This matters because this system holds real
 *   customer and financial data, and an unverified TLS connection only
 *   protects against passive eavesdropping, not an active man-in-the-middle
 *   attacker presenting their own certificate.
 * - `DB_SSL_REJECT_UNAUTHORIZED=false` is an emergency-only escape hatch: set
 *   it ONLY if strict verification unexpectedly breaks the production
 *   connection (e.g. the database's certificate cannot be verified against
 *   Node's default trusted root store). This should never be set in normal
 *   operation — see AGENTS.md's Deployment section for the post-deploy
 *   smoke-test checklist that exercises this.
 */
function sslConfigFor(hostOrUrl: string | undefined): false | { rejectUnauthorized: boolean } {
  if (isLocalConnection(hostOrUrl)) return false;
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";
  return { rejectUnauthorized };
}

export async function shutdown(): Promise<void> {
  console.log("Shutting down...");
  try {
    await pool.end();
    console.log("Database pool closed");
  } catch (err) {
    console.error("Error closing the pool", err);
  } finally {
    process.exit(0);
  }
}

const txStorage = new AsyncLocalStorage<PoolClient>();

/**
 * Wraps fn in a database transaction. Use whenever an operation writes to multiple tables.
 * run_query automatically uses the active transaction client — no extra plumbing needed.
 * Nesting is safe: a nested withTransaction call reuses the outer transaction.
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  if (txStorage.getStore()) return fn(); // already in a transaction
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await txStorage.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function run_query<T extends Record<string, any> = any>(
  query: QueryConfig
): Promise<T[]> {
  const tx = txStorage.getStore();
  if (tx) {
    const res = await tx.query<T>(query);
    return res.rows;
  }
  const client = await pool.connect();
  try {
    const res = await client.query<T>(query);
    return res.rows;
  } finally {
    client.release();
  }
}

export { pool };
