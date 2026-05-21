/**
 * One-time migration: Airtable "Drawings (Scott)" → fee allocations + line items in the app DB.
 *
 * For each Airtable Gig record that has a non-zero "Drawings (Scott)" value,
 * this script creates a fee allocation (Scott ↔ gig) and a line item on it
 * recording the drawing amount. No account transactions are created.
 *
 * Not idempotent — run once only.
 *
 * Usage:
 *   cd packages/api
 *   pnpm migrate:scott-drawings
 *
 * Required env vars:
 *   AIRTABLE_API_KEY, API_BASE_URL, MIGRATION_EMAIL, MIGRATION_PASSWORD
 *
 * Before running, wipe previously imported data (use Scott's person_id=483):
 *   DELETE FROM fee_allocation_line_items WHERE allocation_id IN (SELECT id FROM fee_allocations WHERE person_id = 483);
 *   DELETE FROM fee_allocations WHERE person_id = 483;
 */

import dotenv from "dotenv";

dotenv.config();

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_ID = "appZXteLrpESv7H8X";
const GIGS_TABLE_ID = "tbldxbkHiZOEcpkrk";

// Airtable field names for the Gigs table
const FIELD_DRAWINGS_SCOTT = "Drawings (Scott)"; // currency, pounds
const FIELD_NAME           = "Name";             // computed DD/MM/YY - Client - Venue

// ─── Types ───────────────────────────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface DbGig {
  id: number;
  date: string;
  firstName: string;
  lastName: string;
  airtableId?: string;
}

interface DbAccount {
  id: number;
  personId: number;
  personName: string;
}

interface FeeAllocation {
  id: number;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

const API_BASE = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
let jwtToken = "";

async function login(): Promise<void> {
  const email = process.env.MIGRATION_EMAIL;
  const password = process.env.MIGRATION_PASSWORD;
  if (!email || !password) {
    throw new Error("MIGRATION_EMAIL and MIGRATION_PASSWORD env vars must be set");
  }
  const delays = [5000, 10000, 20000];
  for (let attempt = 0; ; attempt++) {
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (resp.status === 502 && attempt < delays.length) {
      console.log(`  Login 502 — retrying in ${delays[attempt] / 1000}s (API may be waking up)...`);
      await sleep(delays[attempt]);
      continue;
    }
    if (!resp.ok) throw new Error(`Login failed: HTTP ${resp.status} ${await resp.text()}`);
    const body = (await resp.json()) as { token: string };
    jwtToken = body.token;
    return;
  }
}

async function callApi<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  // Render free tier spins down and can take 30-60s to wake; retry generously.
  const delays = [3000, 5000, 10000, 15000, 20000, 30000];
  for (let attempt = 0; ; attempt++) {
    const resp = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (resp.status === 502 && attempt < delays.length) {
      console.log(`    502 on ${method} ${path} — retrying in ${delays[attempt] / 1000}s...`);
      await sleep(delays[attempt]);
      continue;
    }
    if (!resp.ok) {
      throw new Error(`API ${method} ${path} → HTTP ${resp.status}: ${await resp.text()}`);
    }
    if (resp.status === 204 || resp.headers.get("content-length") === "0") return undefined as T;
    const text = await resp.text();
    return text ? JSON.parse(text) as T : undefined as T;
  }
}

// ─── Airtable helpers ─────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function fetchTable(tableId: string, fieldIds?: string[]): Promise<AirtableRecord[]> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) throw new Error("AIRTABLE_API_KEY env var is not set");

  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    if (fieldIds) {
      for (const fId of fieldIds) params.append("fields[]", fId);
    }
    const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;

    let resp: Response;
    // Retry loop for 429 rate-limit responses
    for (;;) {
      resp = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (resp.status === 429) {
        console.log("    Rate limited — waiting 30 s...");
        await sleep(30_000);
      } else {
        break;
      }
    }

    if (!resp.ok) {
      throw new Error(`Airtable HTTP ${resp.status}: ${await resp.text()}`);
    }

    const body = (await resp.json()) as {
      records: AirtableRecord[];
      offset?: string;
    };
    records.push(...body.records);
    offset = body.offset;
    if (offset) await sleep(220); // ~4.5 req/s
  } while (offset);

  return records;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Validate required env vars up front
  const missing = ["AIRTABLE_API_KEY", "API_BASE_URL", "MIGRATION_EMAIL", "MIGRATION_PASSWORD"]
    .filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  await login();
  console.log("✓ Authenticated\n");
  console.log("=== Scott drawings migration ===\n");

  // ── 1. Locate Scott's person ID ────────────────────────────────────────────
  const accounts = await callApi<DbAccount[]>("GET", "/accounts");
  const scottAccount = accounts.find((a) => a.personName === "Scott Bruce (Partner)");
  if (!scottAccount) {
    console.error("Could not find account for 'Scott Bruce (Partner)' — aborting.");
    process.exit(1);
  }
  const scottPersonId = scottAccount.personId;
  console.log(`✓ Found Scott: personId=${scottPersonId}\n`);

  // ── 2. Build DB gig map (airtableId → gig) ─────────────────────────────────
  const dbGigs = await callApi<DbGig[]>("GET", "/gigs");
  const gigMap = new Map<string, DbGig>();
  for (const g of dbGigs) {
    if (g.airtableId) gigMap.set(g.airtableId, g);
  }
  console.log(`✓ Loaded ${gigMap.size} gigs from DB (with airtableId)\n`);

  // ── 3. Fetch Airtable gigs ──────────────────────────────────────────────────
  console.log("→ Fetching gigs from Airtable...");
  const atGigs = await fetchTable(GIGS_TABLE_ID, [
    "Drawings (Scott)",
    "Name",
  ]);
  console.log(`   ${atGigs.length} records fetched\n`);

  // ── 4. Process each gig ────────────────────────────────────────────────────
  let allocationsCreated = 0;
  let skippedNoDrawing   = 0;
  let skippedNotInDb     = 0;
  let failed             = 0;

  for (const r of atGigs) {
    const drawingValue = r.fields[FIELD_DRAWINGS_SCOTT];

    // Skip records with no drawing value
    if (!drawingValue || typeof drawingValue !== "number" || drawingValue <= 0) {
      skippedNoDrawing++;
      continue;
    }

    const dbGig = gigMap.get(r.id);
    if (!dbGig) {
      console.log(`⚠ Skipping ${r.id}: gig not in DB`);
      skippedNotInDb++;
      continue;
    }

    try {
      // Create fee allocation: Scott ↔ this gig
      const allocation = await callApi<FeeAllocation>("POST", "/fee-allocations", {
        personId: scottPersonId,
        gigId: dbGig.id,
      });

      const description = typeof r.fields[FIELD_NAME] === "string"
        ? (r.fields[FIELD_NAME] as string)
        : `Gig ${dbGig.id}`;

      // Create a line item on the allocation recording the drawing amount
      await callApi("POST", `/fee-allocations/${allocation.id}/line-items`, {
        description,
        amount: Math.round(drawingValue * 100),
      });

      console.log(`✓ ${description} — £${drawingValue.toFixed(2)}`);
      allocationsCreated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${r.id}: ${msg}`);
      failed++;
    }
  }

  // ── 5. Summary ─────────────────────────────────────────────────────────────
  console.log("\n=== Scott drawings migration complete ===");
  console.log(`Gigs inspected         : ${atGigs.length}`);
  console.log(`Allocations created    : ${allocationsCreated}`);
  console.log(`Skipped (no drawing)   : ${skippedNoDrawing}`);
  console.log(`Skipped (not in DB)    : ${skippedNotInDb}`);
  console.log(`Failed                 : ${failed}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
