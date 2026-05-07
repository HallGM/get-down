/**
 * One-time migration: Airtable expense attachments → R2 + DB.
 *
 * For each Airtable expense record that has an attachment in the
 * "Invoice/Receipt/Other" field, this script downloads the file and uploads
 * it to the app via POST /expenses/:id/document.
 *
 * Idempotent: expenses that already have a document in the DB are skipped.
 * Expenses with no Airtable attachment are silently skipped.
 * If a record has multiple attachments, only the first is used.
 *
 * Usage:
 *   cd packages/api
 *   pnpm migrate:documents
 *
 * Required env vars:
 *   AIRTABLE_API_KEY, API_BASE_URL, MIGRATION_EMAIL, MIGRATION_PASSWORD
 */

import dotenv from "dotenv";

dotenv.config();

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_ID = "appZXteLrpESv7H8X";
const EXPENSES_TABLE_ID = "tbljLOEDbueq51OTs";
const ATTACHMENT_FIELD = "Invoice/Receipt/Other";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
}

interface DbExpense {
  id: number;
  airtableId?: string;
  documentUrl?: string;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

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

async function callApi<T = unknown>(method: string, path: string): Promise<T> {
  const delays = [3000, 5000, 10000, 15000, 20000, 30000];
  for (let attempt = 0; ; attempt++) {
    const resp = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${jwtToken}` },
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

async function uploadDocument(expenseId: number, fileBuffer: ArrayBuffer, filename: string, mimeType: string): Promise<void> {
  const delays = [3000, 5000, 10000, 15000, 20000, 30000];
  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer], { type: mimeType }), filename);

  for (let attempt = 0; ; attempt++) {
    const resp = await fetch(`${API_BASE}/expenses/${expenseId}/document`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwtToken}` },
      body: formData,
    });
    if (resp.status === 502 && attempt < delays.length) {
      console.log(`    502 uploading document for expense ${expenseId} — retrying in ${delays[attempt] / 1000}s...`);
      await sleep(delays[attempt]);
      continue;
    }
    if (!resp.ok) throw new Error(`Upload failed for expense ${expenseId}: HTTP ${resp.status}: ${await resp.text()}`);
    return;
  }
}

// ─── Airtable helpers ─────────────────────────────────────────────────────────

async function fetchTable(tableId: string): Promise<AirtableRecord[]> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) throw new Error("AIRTABLE_API_KEY env var is not set");

  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
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
    if (offset) await sleep(220); // ~4.5 req/s
  } while (offset);

  return records;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await login();
  console.log("✓ Authenticated\n");
  console.log("=== Expense document migration: Airtable → R2 ===\n");

  // Build airtableId → expense map from the DB (via API)
  const dbExpenses = await callApi<DbExpense[]>("GET", "/expenses");
  const expenseByAirtableId = new Map<string, DbExpense>();
  for (const e of dbExpenses) {
    if (e.airtableId) expenseByAirtableId.set(e.airtableId, e);
  }
  console.log(`  ${dbExpenses.length} expenses loaded from DB\n`);

  // Fetch Airtable expenses
  const atExpenses = await fetchTable(EXPENSES_TABLE_ID);
  console.log(`  ${atExpenses.length} Airtable expense records fetched\n`);

  let uploaded = 0;
  let skippedNoAttachment = 0;
  let skippedAlreadyHasDoc = 0;
  let skippedNotInDb = 0;
  let failed = 0;

  for (const r of atExpenses) {
    const attachments = r.fields[ATTACHMENT_FIELD];

    // Silently skip if no attachment
    if (!Array.isArray(attachments) || attachments.length === 0) {
      skippedNoAttachment++;
      continue;
    }

    const dbExpense = expenseByAirtableId.get(r.id);

    // Skip if not found in DB
    if (!dbExpense) {
      skippedNotInDb++;
      console.log(`  ⚠ Airtable record ${r.id} not found in DB — skipping`);
      continue;
    }

    // Skip if already has a document
    if (dbExpense.documentUrl) {
      skippedAlreadyHasDoc++;
      console.log(`  → expense ${dbExpense.id} already has a document — skipping`);
      continue;
    }

    const attachment = (attachments as AirtableAttachment[])[0];
    const { url, filename, type: mimeType } = attachment;

    try {
      // Download from Airtable (URL expires after 2 hours)
      const fileResp = await fetch(url);
      if (!fileResp.ok) throw new Error(`HTTP ${fileResp.status} downloading ${url}`);
      const buffer = await fileResp.arrayBuffer();

      await uploadDocument(dbExpense.id, buffer, filename, mimeType || "application/octet-stream");

      console.log(`  ✓ expense ${dbExpense.id} — uploaded "${filename}" (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
      uploaded++;
    } catch (err) {
      console.error(`  ✗ expense ${dbExpense.id} — failed: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`
=== Done ===
  Uploaded:              ${uploaded}
  Already had document:  ${skippedAlreadyHasDoc}
  No Airtable attachment:${skippedNoAttachment}
  Not found in DB:       ${skippedNotInDb}
  Failed:                ${failed}
`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
