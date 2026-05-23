/**
 * Backfill historical client payments received into Scott Bruce (Partner)'s
 * personal account.
 *
 * Reads Airtable's "D Paid?" and "B Paid?" checkboxes on each gig and creates:
 *   - A payment record in the payments table (flagged with received_by_person_id)
 *   - A matching account transaction on Scott's account (type: "client_payment_received")
 *
 * Safe to run multiple times — idempotent by description matching.
 *
 * Usage:
 *   cd packages/api
 *   pnpm tsx src/scripts/backfill_scott_payments.ts
 *
 * Required env vars: AIRTABLE_API_KEY, API_BASE_URL, MIGRATION_EMAIL, MIGRATION_PASSWORD
 */

import dotenv from "dotenv";

dotenv.config();

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_ID = "appZXteLrpESv7H8X";
const GIGS_TABLE_ID = "tbldxbkHiZOEcpkrk";

const SCOTT_DISPLAY_NAME = "Scott Bruce (Partner)";
const DEPOSIT_DESCRIPTION = "Deposit (Airtable backfill)";
const BALANCE_DESCRIPTION = "Balance (Airtable backfill)";
const TRANSACTION_TYPE = "client_payment_received";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface ApiPerson {
  id: number;
  displayName?: string;
}

interface ApiAccount {
  id: number;
  personId: number;
}

interface ApiTransaction {
  id: number;
  description?: string;
}

interface ApiPayment {
  id: number;
  description?: string;
}

interface DbGig {
  id: number;
  airtableId?: string;
  firstName: string;
  lastName: string;
  partnerName?: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

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

function toP(val: unknown): number {
  return typeof val === "number" ? Math.round(val * 100) : 0;
}

async function sleep(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms));
}

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
  console.log("=== Backfill: Scott's received client payments ===\n");

  // ── 1. Find Scott's person record ──────────────────────────────────────────
  const people = await callApi<ApiPerson[]>("GET", "/people");
  const scottMatches = people.filter((p) => p.displayName === SCOTT_DISPLAY_NAME);
  if (scottMatches.length === 0) {
    throw new Error(`No person found with display name "${SCOTT_DISPLAY_NAME}". Aborting.`);
  }
  if (scottMatches.length > 1) {
    throw new Error(
      `Multiple people found with display name "${SCOTT_DISPLAY_NAME}" (ids: ${scottMatches.map((p) => p.id).join(", ")}). Aborting.`
    );
  }
  const scottPersonId = scottMatches[0].id;
  console.log(`✓ Found ${SCOTT_DISPLAY_NAME} (person id: ${scottPersonId})`);

  // ── 2. Find Scott's account ────────────────────────────────────────────────
  const accounts = await callApi<ApiAccount[]>("GET", "/accounts");
  const scottAccount = accounts.find((a) => a.personId === scottPersonId);
  if (!scottAccount) {
    throw new Error(
      `No account found for person id ${scottPersonId} (${SCOTT_DISPLAY_NAME}). ` +
      `Create one via the accounts UI first.`
    );
  }
  const scottAccountId = scottAccount.id;
  console.log(`✓ Found account (id: ${scottAccountId})\n`);

  // ── 3. Pre-load Scott's existing transactions (for idempotency) ────────────
  const existingTransactions = await callApi<ApiTransaction[]>(
    "GET",
    `/accounts/${scottAccountId}/transactions`
  );
  const existingTransactionDescriptions = new Set(
    existingTransactions.map((t) => t.description ?? "").filter(Boolean)
  );

  // ── 4. Fetch all Airtable gigs ─────────────────────────────────────────────
  console.log("→ Fetching Airtable gigs...");
  const atGigs = await fetchTable(GIGS_TABLE_ID);
  console.log(`   ${atGigs.length} gigs fetched\n`);

  // ── 5. Pre-load all DB gigs ────────────────────────────────────────────────
  const dbGigs = await callApi<DbGig[]>("GET", "/gigs");

  // ── 6. Process each gig ────────────────────────────────────────────────────
  let gigsProcessed = 0;
  let depositsCreated = 0;
  let balancesCreated = 0;
  let transactionsCreated = 0;
  let paymentsSkipped = 0;
  let anomaliesSkipped = 0;

  for (const r of atGigs) {
    const f = r.fields;
    const dPaid = f["fldWFhKa45Yoq3pf1"] === true;
    const bPaid = f["fldZH7cu2EJ7WoUJF"] === true;

    // Skip gigs where nothing was paid
    if (!dPaid && !bPaid) continue;

    gigsProcessed++;
    const gigDate = typeof f["fldsP7rj6ja1uDxVn"] === "string" ? f["fldsP7rj6ja1uDxVn"] : null;

    // Anomaly: no date on gig
    if (!gigDate) {
      console.warn(`  ⚠ ANOMALY: no date on gig ${r.id} — skipping`);
      anomaliesSkipped++;
      continue;
    }

    // Anomaly: balance paid but no deposit
    if (bPaid && !dPaid) {
      console.warn(`  ⚠ ANOMALY — balance ticked but no deposit: ${r.id}`);
      anomaliesSkipped++;
      continue;
    }

    // Find the DB gig by airtable_id
    const dbGig = dbGigs.find((g) => g.airtableId === r.id);
    if (!dbGig) {
      console.warn(`  ⚠ Gig not found in DB (airtable_id: ${r.id}) — skipping`);
      anomaliesSkipped++;
      continue;
    }

    const gigId = dbGig.id;
    const gigName = dbGig.partnerName
      ? `${dbGig.firstName} ${dbGig.lastName} & ${dbGig.partnerName}`
      : `${dbGig.firstName} ${dbGig.lastName}`;
    const depositAmount = toP(f["fldI6OgUknB2itC6k"]);   // Deposit Amount
    const totalAmount   = toP(f["fldYvImCMuBMizBsA"]);   // Total Charge (actual)
    const balanceAmount = totalAmount - depositAmount;

    // Fetch existing payments for this gig (idempotency)
    const existingPayments = await callApi<ApiPayment[]>("GET", `/gigs/${gigId}/payments`);
    const existingDescs = new Set(existingPayments.map((p) => p.description ?? ""));

    const depositStr = depositAmount ? `£${(depositAmount / 100).toFixed(2)}` : "£0 (no deposit)";
    const balanceStr = bPaid ? `£${(balanceAmount / 100).toFixed(2)}` : "not paid";
    console.log(`  ${gigName.padEnd(45)} deposit: ${depositStr.padEnd(18)} balance: ${balanceStr}`);

    // ── Deposit payment ──────────────────────────────────────────────────────
    if (existingDescs.has(DEPOSIT_DESCRIPTION)) {
      paymentsSkipped++;
    } else {
      await callApi("POST", "/payments", {
        gigId,
        date: gigDate,
        amount: depositAmount,
        description: DEPOSIT_DESCRIPTION,
      });
      depositsCreated++;

      // Account transaction for deposit
      const txDepositDesc = `${DEPOSIT_DESCRIPTION} — ${gigName} (#${gigId})`;
      if (!existingTransactionDescriptions.has(txDepositDesc)) {
        await callApi("POST", `/accounts/${scottAccountId}/transactions`, {
          date: gigDate,
          amount: depositAmount,
          type: TRANSACTION_TYPE,
          description: txDepositDesc,
        });
        existingTransactionDescriptions.add(txDepositDesc);
        transactionsCreated++;
      }
    }

    // ── Balance payment ──────────────────────────────────────────────────────
    if (bPaid) {
      if (existingDescs.has(BALANCE_DESCRIPTION)) {
        paymentsSkipped++;
      } else {
        await callApi("POST", "/payments", {
          gigId,
          date: gigDate,
          amount: balanceAmount,
          description: BALANCE_DESCRIPTION,
        });
        balancesCreated++;

        // Account transaction for balance
        const txBalanceDesc = `${BALANCE_DESCRIPTION} — ${gigName} (#${gigId})`;
        if (!existingTransactionDescriptions.has(txBalanceDesc)) {
          await callApi("POST", `/accounts/${scottAccountId}/transactions`, {
            date: gigDate,
            amount: balanceAmount,
            type: TRANSACTION_TYPE,
            description: txBalanceDesc,
          });
          existingTransactionDescriptions.add(txBalanceDesc);
          transactionsCreated++;
        }
      }
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n=== Backfill complete ===");
  console.log(`  Gigs processed:          ${gigsProcessed}`);
  console.log(`  Deposit payments created: ${depositsCreated}`);
  console.log(`  Balance payments created: ${balancesCreated}`);
  console.log(`  Account txns created:     ${transactionsCreated}`);
  console.log(`  Payments already existed: ${paymentsSkipped}`);
  console.log(`  Anomalies skipped:        ${anomaliesSkipped}`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
