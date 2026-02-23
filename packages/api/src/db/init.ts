import Pg, { Pool, QueryConfig } from "pg";
import dotenv from "dotenv";

const { Pool: PoolConstructor } = Pg;

dotenv.config();

const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const pool = new PoolConstructor({
  user: dbUser,
  host: dbHost,
  database: "get_down",
  password: dbPassword,
  port: dbPort,
});

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

export async function run_query<T extends Record<string, any> = any>(
  query: QueryConfig
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(query);
    return res.rows;
  } finally {
    client.release();
  }
}

export { pool };
