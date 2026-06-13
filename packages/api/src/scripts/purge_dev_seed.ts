/**
 * Removes all dev-seed data from the database.
 *
 * Dev seed data is identifiable by:
 *   - Specific email addresses  (@dev.local, admin@get-down.com)
 *   - Gig names used only in seed.sql (Charlie Testington, Alice Sample, etc.)
 *   - Attributions whose name starts with "Dev Seed"
 *   - Expenses / songs whose description / title starts with "Dev Seed:"
 *
 * Run in dry-run mode first (default) to see what would be deleted:
 *
 *   pnpm tsx src/scripts/purge_dev_seed.ts
 *
 * Then pass --execute to actually delete:
 *
 *   pnpm tsx src/scripts/purge_dev_seed.ts --execute
 *
 * To target the production database, temporarily set DATABASE_URL in .env
 * to the production connection string (see the commented-out line in .env).
 */

import dotenv from "dotenv";
import { pool } from "../db/init.js";

dotenv.config();

const DRY_RUN = !process.argv.includes("--execute");

// ─── Identifiers ─────────────────────────────────────────────────────────────

const DEV_EMAILS = ["admin@get-down.com", "garry@dev.local", "scott@dev.local"];

const DEV_GIGS: Array<[string, string]> = [
  ["Charlie",     "Testington"],
  ["Eve",         "Devson"],
  ["Alice",       "Sample"],
  ["Dev Balance", "Alert"],
  ["Dev Partial", "Alert"],
  ["Dev Pre",     "Partnership"],
];

const DEV_ATTRIBUTION_NAMES = [
  "Dev Seed Referral",
  "Dev Seed Showcase Co",
  "Dev Seed Showcase B Co",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const res = await pool.query<{ n: string }>(sql, params);
  return parseInt(res.rows[0]?.n ?? "0", 10);
}

async function preview(label: string, sql: string, params: unknown[] = []): Promise<number> {
  const n = await count(sql, params);
  const flag = n > 0 ? "  ✖" : "  ·";
  console.log(`${flag}  ${label}: ${n}`);
  return n;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log(DRY_RUN
    ? "\n[purge-dev-seed] DRY RUN — no data will be deleted. Pass --execute to delete.\n"
    : "\n[purge-dev-seed] EXECUTE — deleting dev seed data from the database.\n"
  );

  // Build param arrays for multi-value IN clauses.
  const emailParams = DEV_EMAILS;
  const emailPlaceholders = DEV_EMAILS.map((_, i) => `$${i + 1}`).join(", ");

  const attrParams = DEV_ATTRIBUTION_NAMES;
  const attrPlaceholders = DEV_ATTRIBUTION_NAMES.map((_, i) => `$${i + 1}`).join(", ");

  const gigCondition = DEV_GIGS
    .map((_, i) => `(first_name = $${i * 2 + 1} AND last_name = $${i * 2 + 2})`)
    .join(" OR ");
  const gigParams = DEV_GIGS.flat();

  // ── Counts ────────────────────────────────────────────────────────────────

  console.log("Records that will be deleted (direct rows only — cascades not shown):\n");

  const peopleCount = await preview(
    "people",
    `SELECT COUNT(*) AS n FROM people WHERE email IN (${emailPlaceholders})`,
    emailParams,
  );
  const gigsCount = await preview(
    "gigs",
    `SELECT COUNT(*) AS n FROM gigs WHERE ${gigCondition}`,
    gigParams,
  );
  const attrCount = await preview(
    "attributions",
    `SELECT COUNT(*) AS n FROM attributions WHERE name IN (${attrPlaceholders})`,
    attrParams,
  );
  const expensesCount = await preview(
    "expenses (description LIKE 'Dev Seed:%')",
    `SELECT COUNT(*) AS n FROM expenses WHERE description LIKE $1`,
    ["Dev Seed:%"],
  );
  const songsCount = await preview(
    "songs (title LIKE 'Dev Seed:%')",
    `SELECT COUNT(*) AS n FROM songs WHERE title LIKE $1`,
    ["Dev Seed:%"],
  );

  const total = peopleCount + gigsCount + attrCount + expensesCount + songsCount;

  if (total === 0) {
    console.log("\nNothing to delete — database looks clean.");
    await pool.end();
    return;
  }

  if (DRY_RUN) {
    console.log(`\n${total} root row(s) found. Re-run with --execute to delete them.`);
    await pool.end();
    return;
  }

  // ── Execute ───────────────────────────────────────────────────────────────

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Null out rehearsals.expense_id where it references a dev expense.
    //    (This FK has no CASCADE / SET NULL rule so must be handled manually.)
    await client.query(
      `UPDATE rehearsals
       SET expense_id = NULL
       WHERE expense_id IN (
         SELECT id FROM expenses WHERE description LIKE $1
       )`,
      ["Dev Seed:%"],
    );

    // 2. Delete dev attributions — cascades to:
    //    showcases → (showcase_expenses, assigned_roles)
    //    attribution_fees → attribution_fees_expenses
    await client.query(
      `DELETE FROM attributions WHERE name IN (${attrPlaceholders})`,
      attrParams,
    );

    // 3. Delete dev gigs — cascades to:
    //    payments, assigned_roles, fee_allocations → (line_items, account_tx_fa, fa_expenses),
    //    gig_line_items, gig_services, set_list_items, gig_song_*, refunds,
    //    invoices → (line_items, charges, payments_made), gig_delivery_videos, rehearsals_gigs
    await client.query(
      `DELETE FROM gigs WHERE ${gigCondition}`,
      gigParams,
    );

    // 4. Delete dev expenses — cascades to:
    //    expense_payments, showcase_expenses, fee_allocations_expenses,
    //    rehearsals_expenses, attribution_fees_expenses
    await client.query(
      `DELETE FROM expenses WHERE description LIKE $1`,
      ["Dev Seed:%"],
    );

    // 5. Delete dev songs — cascades to:
    //    set_list_items, house_playlist_songs, gig_song_*
    await client.query(
      `DELETE FROM songs WHERE title LIKE $1`,
      ["Dev Seed:%"],
    );

    // 6. Delete orphaned dev genres (only if no songs reference them).
    //    Pop and Rock were seeded in the dev block — skip if any real songs use them.
    await client.query(
      `DELETE FROM genres
       WHERE name IN ('Pop', 'Rock')
         AND NOT EXISTS (SELECT 1 FROM songs WHERE genre_id = genres.id)`,
    );

    // 7. Delete dev people — cascades to:
    //    accounts → (account_transactions → account_transactions_fee_allocations,
    //                expense_payments)
    //    fee_allocations → (line_items, account_tx_fa, fa_expenses)
    //    people_roles
    //    assigned_roles.person_id → SET NULL (no cascade needed)
    await client.query(
      `DELETE FROM people WHERE email IN (${emailPlaceholders})`,
      emailParams,
    );

    await client.query("COMMIT");
    console.log("\n[purge-dev-seed] Done. All dev seed data removed.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[purge-dev-seed] Error — transaction rolled back:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
