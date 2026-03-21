/**
 * Create a partner (admin) user directly in the database.
 *
 * Designed to be run once to bootstrap the first user, or any time you need
 * to create a user without going through the API. Connects directly to
 * Postgres via the same env vars as the API.
 *
 * Usage (local):
 *   cd packages/api
 *   pnpm create-user --email=you@example.com --password=secret --first=Garry --last=Hall
 *
 * Usage (Render shell — paste into the shell of the get-down-api service):
 *   node packages/api/dist/scripts/create_user.js \
 *     --email=you@example.com --password=secret --first=Garry --last=Hall
 *
 * Or set env vars instead of flags:
 *   CREATE_EMAIL=you@example.com CREATE_PASSWORD=secret CREATE_FIRST=Garry CREATE_LAST=Hall pnpm create-user
 */

import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pool } from "../db/init.js";

dotenv.config();

function arg(flag: string, envVar: string): string | undefined {
  const flagValue = process.argv.find((a) => a.startsWith(`--${flag}=`))?.split("=").slice(1).join("=");
  return flagValue ?? process.env[envVar];
}

async function main() {
  const email     = arg("email",    "CREATE_EMAIL");
  const password  = arg("password", "CREATE_PASSWORD");
  const firstName = arg("first",    "CREATE_FIRST");
  const lastName  = arg("last",     "CREATE_LAST");

  if (!email || !password || !firstName) {
    console.error("Usage: pnpm create-user --email=<email> --password=<pass> --first=<firstName> [--last=<lastName>]");
    console.error("       or set CREATE_EMAIL, CREATE_PASSWORD, CREATE_FIRST, CREATE_LAST env vars");
    process.exit(1);
  }

  const normalised = email.trim().toLowerCase();

  const existing = await pool.query(
    "SELECT id FROM people WHERE lower(email) = $1 LIMIT 1",
    [normalised]
  );
  if (existing.rows.length > 0) {
    console.error(`✗ A user with email "${normalised}" already exists (id=${existing.rows[0].id})`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("✗ Password must be at least 8 characters");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const displayName  = [firstName.trim(), lastName?.trim()].filter(Boolean).join(" ");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [person] } = await client.query<{ id: number }>(
      `INSERT INTO people (first_name, last_name, display_name, email, password_hash, is_partner, is_active)
       VALUES ($1, $2, $3, $4, $5, true, true)
       RETURNING id`,
      [firstName.trim(), lastName?.trim() ?? null, displayName, normalised, passwordHash]
    );
    await client.query(
      `INSERT INTO accounts (person_id) VALUES ($1)`,
      [person.id]
    );
    await client.query("COMMIT");
    console.log(`✓ Created user "${displayName}" <${normalised}> (id=${person.id})`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
