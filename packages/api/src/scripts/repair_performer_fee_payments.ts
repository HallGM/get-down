/**
 * One-time repair: remove bad performer-fee payments and create correct fee allocations.
 *
 * The initial Airtable migration (step 10 of migrate_airtable.ts) mistakenly
 * inserted Gig Payment records (performer fees, money OUT) into the client
 * payments table (money IN), inflating business income on the ledger.
 *
 * This script:
 *   1. Identifies bad payments by description prefix "Performer fee:" with an airtableId set.
 *   2. For each bad payment, finds or creates the correct fee allocation (personId, gigId pair).
 *   3. Ensures a "Performer fee" line item exists on the allocation.
 *   4. Links the existing performer invoice expense (if already imported via migrate:invoice-expenses).
 *   5. Deletes the bad payment record.
 *
 * Idempotent: on a second run the bad-payment filter returns an empty list,
 * the repair loop does not execute, all counters print zero, and the script
 * exits 0.
 *
 * Usage:
 *   cd packages/api
 *   pnpm repair:performer-fees
 *
 * Required env vars:
 *   AIRTABLE_API_KEY, API_BASE_URL, MIGRATION_EMAIL, MIGRATION_PASSWORD
 */

import dotenv from "dotenv";

dotenv.config();

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_ID = "appZXteLrpESv7H8X";
const GIG_PAYMENTS_TABLE_ID = "tblmoq1Xt57MR5p4X";

// Stable Airtable field IDs (use returnFieldsByFieldId: true)
const FIELD_PERSON   = "fldVC81qdEnvC43zK";
const FIELD_GIG      = "fldcNhjbDOBJOdY14";
const FIELD_AMOUNT   = "fldnqei8DiNa2m8Aw";
const FIELD_INVOICES = "fldb0WsDsVR4HgBl3";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface ApiPayment {
  id: number;
  gigId: number;
  description?: string;
  airtableId?: string;
}

interface ApiFeeAllocation {
  id: number;
  personId?: number;
  gigId?: number;
  isInvoiced: boolean;
  lineItems?: ApiFeeAllocationLineItem[];
  expenseIds: number[];
  transactionIds: number[];
}

interface ApiFeeAllocationLineItem {
  id: number;
  allocationId: number;
  description?: string;
  amount?: number;
}

interface ApiPerson {
  id: number;
  airtableId?: string;
}

interface ApiExpense {
  id: number;
  airtableId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely read an array-of-record-IDs field, defaulting to []. */
function ids(val: unknown): string[] {
  return Array.isArray(val) ? (val as string[]) : [];
}

/** Convert pounds (Airtable float) to pence (DB integer). */
function toP(val: unknown): number {
  return typeof val === "number" ? Math.round(val * 100) : 0;
}

async function sleep(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ─── Airtable fetch ───────────────────────────────────────────────────────────

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
        console.log("    Rate limited — waiting 30 s...");
        await sleep(30_000);
      } else {
        break;
      }
    }

    if (!resp.ok) throw new Error(`Airtable HTTP ${resp.status}: ${await resp.text()}`);

    const body = (await resp.json()) as { records: AirtableRecord[]; offset?: string };
    records.push(...body.records);
    offset = body.offset;
    if (offset) await sleep(220); // ~4.5 req/s
  } while (offset);

  return records;
}

// ─── REST API helpers ─────────────────────────────────────────────────────────

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
    if (!resp.ok) throw new Error(`API ${method} ${path} → HTTP ${resp.status}: ${await resp.text()}`);
    if (resp.status === 204 || resp.headers.get("content-length") === "0") return undefined as T;
    const text = await resp.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Validate env vars upfront
  const missing = ["AIRTABLE_API_KEY", "API_BASE_URL", "MIGRATION_EMAIL", "MIGRATION_PASSWORD"].filter(
    (k) => !process.env[k],
  );
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  await login();
  console.log("✓ Authenticated\n");
  console.log("=== Repair: performer-fee payments → fee allocations ===\n");

  // ── 1. Load Airtable Gig Payment table ──────────────────────────────────────

  console.log("→ Fetching Airtable Gig Payment records...");
  const atGigPayments = await fetchTable(GIG_PAYMENTS_TABLE_ID);
  console.log(`  ${atGigPayments.length} records fetched`);

  // Build map: gigPaymentAtId → { personAtIds, amountPence, invoiceAtId }
  const gigPaymentMap = new Map<string, { personAtIds: string[]; amountPence: number; invoiceAtId: string | null }>();
  for (const r of atGigPayments) {
    const f = r.fields;
    const personAtIds = ids(f[FIELD_PERSON]);
    const amountPence = toP(f[FIELD_AMOUNT]);
    const invoiceArr = ids(f[FIELD_INVOICES]);
    const invoiceAtId = invoiceArr.length > 0 ? invoiceArr[0] : null;
    gigPaymentMap.set(r.id, { personAtIds, amountPence, invoiceAtId });
  }

  // ── 2. Load DB state ─────────────────────────────────────────────────────────

  console.log("\n→ Loading DB state...");

  const dbPeople = await callApi<ApiPerson[]>("GET", "/people");
  const peopleMap = new Map<string, number>(); // personAtId → personId
  for (const p of dbPeople) {
    if (p.airtableId) peopleMap.set(p.airtableId, p.id);
  }
  console.log(`  ${dbPeople.length} people (${peopleMap.size} with airtableId)`);

  const dbExpenses = await callApi<ApiExpense[]>("GET", "/expenses");
  const expensesMap = new Map<string, number>(); // expenseAtId → expenseId
  for (const e of dbExpenses) {
    if (e.airtableId) expensesMap.set(e.airtableId, e.id);
  }
  console.log(`  ${dbExpenses.length} expenses (${expensesMap.size} with airtableId)`);

  const allPayments = await callApi<ApiPayment[]>("GET", "/payments");
  const badPayments = allPayments.filter(
    (p): p is ApiPayment & { airtableId: string } =>
      typeof p.description === "string" && p.description.startsWith("Performer fee:") && !!p.airtableId,
  );
  console.log(`  ${allPayments.length} payments total, ${badPayments.length} bad (Performer fee: + airtableId)\n`);

  if (badPayments.length === 0) {
    console.log("Nothing to repair. Exiting.");
    return;
  }

  // ── 3. Repair loop ───────────────────────────────────────────────────────────

  console.log("→ Repairing...\n");

  let allocationsCreated  = 0;
  let allocationsReused   = 0;
  let lineItemsCreated    = 0;
  let expenseLinksCreated = 0;
  let paymentsDeleted     = 0;
  let skipped             = 0;

  for (const payment of badPayments) {
    const gigId = payment.gigId;

    // Resolve Airtable data for this payment
    const atData = gigPaymentMap.get(payment.airtableId);
    if (!atData) {
      console.warn(`  ⚠ payment #${payment.id}: airtableId "${payment.airtableId}" not in Airtable — skipping`);
      skipped++;
      continue;
    }

    const { personAtIds, amountPence, invoiceAtId } = atData;

    if (personAtIds.length === 0) {
      console.warn(`  ⚠ payment #${payment.id}: no person linked in Airtable — skipping`);
      skipped++;
      continue;
    }

    const personId = peopleMap.get(personAtIds[0]);
    if (personId === undefined) {
      console.warn(`  ⚠ payment #${payment.id}: Airtable person "${personAtIds[0]}" not in DB — skipping`);
      skipped++;
      continue;
    }

    // a. Find or create the fee allocation for (personId, gigId)
    const gigAllocations = await callApi<ApiFeeAllocation[]>("GET", `/gigs/${gigId}/fee-allocations`);
    let allocation: ApiFeeAllocation | undefined = gigAllocations.find((a) => a.personId === personId);

    if (!allocation) {
      const created = await callApi<ApiFeeAllocation>("POST", "/fee-allocations", {
        personId,
        gigId,
        isInvoiced: invoiceAtId !== null,
      });
      // GET by ID returns full object with lineItems and expenseIds
      allocation = await callApi<ApiFeeAllocation>("GET", `/fee-allocations/${created.id}`);
      allocationsCreated++;
      console.log(`  + allocation #${allocation.id} (person ${personId}, gig ${gigId})`);
    } else {
      allocationsReused++;
    }

    // b. Ensure the line item exists (match by amount)
    const lineItems = allocation.lineItems ?? [];
    const hasLineItem = lineItems.some((li) => li.amount === amountPence);
    if (!hasLineItem) {
      await callApi("POST", `/fee-allocations/${allocation.id}/line-items`, {
        description: "Performer fee",
        amount: amountPence,
      });
      lineItemsCreated++;
    }

    // c. Link the existing expense if available
    if (invoiceAtId !== null && expensesMap.has(invoiceAtId)) {
      const expenseId = expensesMap.get(invoiceAtId)!;
      if (!allocation.expenseIds.includes(expenseId)) {
        await callApi("POST", `/fee-allocations/${allocation.id}/expenses`, { expenseId });
        expenseLinksCreated++;
      }
    }

    // d. Delete the bad payment
    await callApi("DELETE", `/payments/${payment.id}`);
    paymentsDeleted++;
    console.log(`  - payment #${payment.id} deleted (gig ${gigId}, person ${personId}, £${(amountPence / 100).toFixed(2)})`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log(`
=== Repair complete ===
  Payments deleted:      ${paymentsDeleted}
  Allocations created:   ${allocationsCreated}
  Allocations reused:    ${allocationsReused}
  Line items created:    ${lineItemsCreated}
  Expense links created: ${expenseLinksCreated}
  Skipped (warnings):    ${skipped}
`);
}

main().catch((err) => {
  console.error("Repair failed:", err);
  process.exit(1);
});
