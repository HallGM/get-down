/**
 * Backfill historical "paid by" links on expenses from Airtable.
 *
 * Reads Airtable's "Paid for by" field (fldXhQb7KK1iktQP8) on each expense
 * record. If the value is "Garry" or "Scott", finds the matching partner's
 * account and updates the expense with paidByAccountId.
 *
 * Safe to run multiple times — skips expenses that already have a
 * paidByAccountId set.
 *
 * Usage:
 *   cd packages/api
 *   pnpm tsx src/scripts/backfill_expense_paid_by.ts
 *
 * Required env vars: AIRTABLE_API_KEY, API_BASE_URL, MIGRATION_EMAIL, MIGRATION_PASSWORD
 */

import dotenv from "dotenv";

dotenv.config();

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_ID = "appZXteLrpESv7H8X";
const EXPENSES_TABLE_ID = "tbljLOEDbueq51OTs";
const PAID_FOR_BY_FIELD_ID = "fldXhQb7KK1iktQP8";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface ApiPerson {
  id: number;
  firstName?: string;
  isPartner?: boolean;
}

interface ApiAccount {
  id: number;
  personId: number;
}

interface ApiExpense {
  id: number;
  airtableId?: string;
  paidByAccountId?: number | null;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
let jwtToken = "";

async function sleep(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms));
}

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
      console.log(`  Login 502 — retrying in ${delays[attempt] / 1000}s...`);
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
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }
}

// ─── Airtable helpers ─────────────────────────────────────────────────────────

async function fetchTable(tableId: string): Promise<AirtableRecord[]> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) throw new Error("AIRTABLE_API_KEY env var is not set");

  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: "100", returnFieldsByFieldId: "true" });
    if (offset) params.set("offset", offset);
    const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;

    let resp: Response;
    for (;;) {
      resp = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (resp.status === 429) {
        console.log("    Rate limited — waiting 30s...");
        await sleep(30_000);
      } else {
        break;
      }
    }

    if (!resp.ok) throw new Error(`Airtable HTTP ${resp.status}: ${await resp.text()}`);

    const body = (await resp.json()) as { records: AirtableRecord[]; offset?: string };
    records.push(...body.records);
    offset = body.offset;
    if (offset) await sleep(220);
  } while (offset);

  return records;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await login();
  console.log("✓ Authenticated\n");
  console.log("=== Backfill: expense paid_by_account_id from Airtable ===\n");

  // ── 1. Load people and accounts ────────────────────────────────────────────
  const people = await callApi<ApiPerson[]>("GET", "/people");
  const accounts = await callApi<ApiAccount[]>("GET", "/accounts");

  // Build a map: lowercase first name → account id (for partners only)
  // People who have accounts are the relevant ones.
  const accountByPersonId = new Map(accounts.map((a) => [a.personId, a.id]));
  const accountByFirstName = new Map<string, number>();
  for (const p of people) {
    if (!p.firstName) continue;
    const accountId = accountByPersonId.get(p.id);
    if (accountId !== undefined) {
      accountByFirstName.set(p.firstName.toLowerCase(), accountId);
    }
  }
  console.log(`✓ Loaded ${people.length} people, ${accounts.length} accounts`);
  console.log(`  Partner accounts found: ${[...accountByFirstName.entries()].map(([n, id]) => `${n} (account ${id})`).join(", ")}\n`);

  // ── 2. Load all DB expenses ─────────────────────────────────────────────────
  const dbExpenses = await callApi<ApiExpense[]>("GET", "/expenses");
  const dbExpensesByAirtableId = new Map(
    dbExpenses.filter((e) => e.airtableId).map((e) => [e.airtableId!, e])
  );
  console.log(`✓ Loaded ${dbExpenses.length} DB expenses (${dbExpensesByAirtableId.size} have airtableId)\n`);

  // ── 3. Fetch Airtable expenses ──────────────────────────────────────────────
  console.log("→ Fetching Airtable expenses...");
  const atExpenses = await fetchTable(EXPENSES_TABLE_ID);
  console.log(`   ${atExpenses.length} records fetched\n`);

  // ── 4. Process each Airtable record ────────────────────────────────────────
  let updated = 0;
  let alreadySet = 0;
  let noMatch = 0;
  let noPaidBy = 0;
  let noDbRecord = 0;

  for (const r of atExpenses) {
    const paidForBy = r.fields[PAID_FOR_BY_FIELD_ID];
    if (!paidForBy || typeof paidForBy !== "string") {
      noPaidBy++;
      continue;
    }

    const firstName = paidForBy.trim().toLowerCase();
    const accountId = accountByFirstName.get(firstName);
    if (accountId === undefined) {
      console.warn(`  ⚠ No account found for "${paidForBy}" (airtable id: ${r.id}) — skipping`);
      noMatch++;
      continue;
    }

    const dbExpense = dbExpensesByAirtableId.get(r.id);
    if (!dbExpense) {
      console.warn(`  ⚠ No DB expense with airtableId "${r.id}" — skipping`);
      noDbRecord++;
      continue;
    }

    if (dbExpense.paidByAccountId != null) {
      alreadySet++;
      continue;
    }

    await callApi("PUT", `/expenses/${dbExpense.id}`, { paidByAccountId: accountId });
    console.log(`  ✓ Expense #${dbExpense.id} — paid by "${paidForBy}" (account ${accountId})`);
    updated++;
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n=== Backfill complete ===");
  console.log(`  Updated:              ${updated}`);
  console.log(`  Already had value:    ${alreadySet}`);
  console.log(`  No "paid for by":     ${noPaidBy}`);
  console.log(`  No matching account:  ${noMatch}`);
  console.log(`  Not in DB:            ${noDbRecord}`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
