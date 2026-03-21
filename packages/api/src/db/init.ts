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
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : { user: dbUser, host: dbHost, database: dbName, password: dbPassword, port: dbPort }
);

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

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
