import Pg from "pg";
import dotenv from "dotenv";

const { Pool } = Pg;

dotenv.config();

const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Configure PostgreSQL connection
const pool = new Pool({
  user: dbUser, // Replace with your PostgreSQL username
  host: dbHost, // Replace with your host if needed
  database: "get_down", // Replace with your database name
  password: dbPassword, // Replace with your password
  port: dbPort, // Default PostgreSQL port
});

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export async function shutdown() {
  console.log("Shutting down...");
  try {
    await pool.end(); // Close the pool gracefully
    console.log("Database pool closed");
  } catch (err) {
    console.error("Error closing the pool", err);
  } finally {
    process.exit(0); // Exit the application
  }
}

export async function run_query(query) {
  const client = await pool.connect();
  try {
    const res = await client.query(query);
    return res.rows;
  } finally {
    client.release();
  }
}
