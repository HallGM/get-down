/**
 * One-time migration: re-point all performer slots and fee records from the
 * legacy "Scott Bruce" person account to the "Scott Bruce (Partner)" account,
 * then delete the legacy account and person record entirely.
 *
 * Covers:
 *   - assigned_roles (gigs and showcases — both share the same person_id column)
 *   - fee_allocations (including invoiced and paid records)
 *   - account_transactions on the legacy account (deleted)
 *   - accounts record for the legacy person (deleted)
 *   - people_roles for the legacy person (deleted)
 *   - the legacy people row itself (deleted)
 *
 * Safe to re-run — exits cleanly if the legacy person is already gone.
 * Everything runs inside a single transaction; any error rolls back all changes.
 *
 * Usage:
 *   cd packages/api
 *   pnpm migrate:scott-account
 *
 * Required env vars: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 * (or DATABASE_URL on Render — loaded automatically from .env locally)
 */

import dotenv from "dotenv";
dotenv.config();

import { pool, run_query, withTransaction } from "../db/init.js";

// ─── Display names ────────────────────────────────────────────────────────────

const LEGACY_DISPLAY_NAME  = "Scott Bruce";
const PARTNER_DISPLAY_NAME = "Scott Bruce (Partner)";

// ─── Row types ────────────────────────────────────────────────────────────────

interface PersonRow {
  id: number;
  display_name: string | null;
  airtable_id: string | null;
}

interface IdRow {
  id: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("=== Migrate Scott Bruce performer account ===\n");

  // ── 1. Locate both person records (outside the transaction — read-only) ──────

  const people = await run_query<PersonRow>({
    text: `SELECT id, display_name, airtable_id FROM people WHERE display_name IN ($1, $2);`,
    values: [LEGACY_DISPLAY_NAME, PARTNER_DISPLAY_NAME],
  });

  const legacyPerson  = people.find((p) => p.display_name === LEGACY_DISPLAY_NAME);
  const partnerPerson = people.find((p) => p.display_name === PARTNER_DISPLAY_NAME);

  if (!legacyPerson) {
    console.log(`✓ Legacy account "${LEGACY_DISPLAY_NAME}" not found — nothing to do.`);
    await pool.end();
    return;
  }

  if (!partnerPerson) {
    console.error(
      `✗ Target account "${PARTNER_DISPLAY_NAME}" not found. ` +
      `Create it before running this script.`
    );
    await pool.end();
    process.exit(1);
  }

  const oldId = legacyPerson.id;
  const newId = partnerPerson.id;

  if (oldId === newId) {
    console.error(
      `✗ Legacy and partner IDs are identical (${oldId}). ` +
      `This is unexpected — aborting to prevent data corruption.`
    );
    await pool.end();
    process.exit(1);
  }

  console.log(`  Legacy  person: id=${oldId}  ("${LEGACY_DISPLAY_NAME}")`);
  console.log(`  Partner person: id=${newId}  ("${PARTNER_DISPLAY_NAME}")`);
  console.log();

  // ── 2. Run everything inside a single transaction ────────────────────────────

  const summary = await withTransaction(async () => {
    // 2a. Copy airtable_id from legacy to partner if partner doesn't have one
    let airtableIdCopied = false;
    if (legacyPerson.airtable_id && !partnerPerson.airtable_id) {
      await run_query({
        text:   `UPDATE people SET airtable_id = $1 WHERE id = $2;`,
        values: [legacyPerson.airtable_id, newId],
      });
      airtableIdCopied = true;
    }

    // 2b. Re-point performer slots (gigs + showcases share person_id)
    const assignedRoles = await run_query<IdRow>({
      text:   `UPDATE assigned_roles SET person_id = $1 WHERE person_id = $2 RETURNING id;`,
      values: [newId, oldId],
    });

    // 2b. Re-point fee allocations (all statuses)
    const feeAllocations = await run_query<IdRow>({
      text:   `UPDATE fee_allocations SET person_id = $1 WHERE person_id = $2 RETURNING id;`,
      values: [newId, oldId],
    });

    // 2c. Find the legacy account (if any)
    const accounts = await run_query<IdRow>({
      text:   `SELECT id FROM accounts WHERE person_id = $1 LIMIT 1;`,
      values: [oldId],
    });
    const legacyAccount = accounts[0] ?? null;

    let txDeleted   = 0;
    let acctDeleted = false;

    if (legacyAccount) {
      // 2d. Delete account transactions
      const txRows = await run_query<IdRow>({
        text:   `DELETE FROM account_transactions WHERE account_id = $1 RETURNING id;`,
        values: [legacyAccount.id],
      });
      txDeleted = txRows.length;

      // 2e. Delete the account
      await run_query({
        text:   `DELETE FROM accounts WHERE id = $1;`,
        values: [legacyAccount.id],
      });
      acctDeleted = true;
    }

    // 2f. Delete people_roles
    const peopleRoles = await run_query<{ person_id: number }>({
      text:   `DELETE FROM people_roles WHERE person_id = $1 RETURNING person_id;`,
      values: [oldId],
    });

    // 2g. Delete the legacy person
    await run_query({
      text:   `DELETE FROM people WHERE id = $1;`,
      values: [oldId],
    });

    return {
      airtableIdCopied,
      assignedRolesUpdated : assignedRoles.length,
      feeAllocationsUpdated: feeAllocations.length,
      txDeleted,
      acctDeleted,
      peopleRolesDeleted   : peopleRoles.length,
    };
  });

  // ── 3. Summary ───────────────────────────────────────────────────────────────

  console.log("✓ Migration complete\n");
  console.log(
    "  Airtable ID copied          :",
    summary.airtableIdCopied
      ? `yes (${legacyPerson.airtable_id})`
      : `no (${partnerPerson.airtable_id ? "partner already has one" : "legacy had none"})`
  );
  console.log("  Performer slots re-pointed  :", summary.assignedRolesUpdated);
  console.log("  Fee records re-pointed      :", summary.feeAllocationsUpdated);
  console.log(
    "  Account transactions deleted:",
    summary.acctDeleted ? String(summary.txDeleted) : "none (no account found)"
  );
  console.log("  Account deleted             :", summary.acctDeleted ? "yes" : "no");
  console.log(
    "  People_roles deleted        :",
    summary.peopleRolesDeleted > 0 ? String(summary.peopleRolesDeleted) : "none"
  );
  console.log("  Legacy person deleted       : yes");

  await pool.end();
}

main().catch(async (err) => {
  console.error("\nMigration failed:", err);
  await pool.end();
  process.exit(1);
});
