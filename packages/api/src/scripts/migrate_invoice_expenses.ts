/**
 * One-time migration: Airtable invoice uploads → expenses in the app DB.
 *
 * For each Airtable Invoice record that has an attached PDF, this script
 * resolves the total amount by summing all linked Gig Payment and/or
 * Showcase Payment records, then creates an expense via the REST API and
 * uploads the PDF as the expense document.
 *
 * Idempotent: invoices whose Airtable record ID is already stored on an
 * expense row (airtable_id field) are skipped on subsequent runs.
 *
 * Skip conditions (silent, no error):
 *   - Invoice has no attached PDF.
 *   - Linked payments exist but all amounts sum to zero (or no payments).
 *
 * Description format:
 *   Single gig    → "<role(s)> - <gig date> - <gig name>"
 *                   (roles omitted if not found in app data)
 *   Single showcase → "showcase - <showcase date> - <showcase name>"
 *   Multiple events → "multiple gigs - <invoice date>"
 *
 * Usage:
 *   cd packages/api
 *   pnpm migrate:invoice-expenses
 *
 * Required env vars:
 *   AIRTABLE_API_KEY, API_BASE_URL, MIGRATION_EMAIL, MIGRATION_PASSWORD
 */

import dotenv from "dotenv";

dotenv.config();

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_ID = "appZXteLrpESv7H8X";

const TABLES = {
  invoices:         "tblhOlcRN2tTGZUdn",
  gigPayments:      "tblmoq1Xt57MR5p4X",
  showcasePayments: "tblPxJAxdJ7jmbGoo",
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size?: number;
  type?: string;
}

interface DbExpense {
  id: number;
  airtableId?: string;
}

interface DbGig {
  id: number;
  airtableId?: string;
  name?: string;
  firstName: string;
  lastName: string;
  date: string;
}

interface DbPerson {
  id: number;
  airtableId?: string;
}

interface DbShowcase {
  id: number;
  airtableId?: string;
  name?: string;
  date: string;
}

interface AssignedRole {
  id: number;
  personId?: number;
  roleName: string;
}

// ─── Helpers: Airtable field accessors ────────────────────────────────────────

/** Safely read an array-of-record-IDs field, defaulting to []. */
function ids(val: unknown): string[] {
  return Array.isArray(val) ? (val as string[]) : [];
}

/** Safely read the first string from a lookup array, or null. */
function lookupFirst(val: unknown): string | null {
  if (!Array.isArray(val) || val.length === 0) return null;
  const first = val[0];
  return typeof first === "string" && first ? first : null;
}

/** Convert pounds (Airtable float) to pence (DB integer). */
function toP(val: unknown): number {
  return typeof val === "number" ? Math.round(val * 100) : 0;
}

// ─── Helpers: sleep / rate-limiting ──────────────────────────────────────────

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
    const params = new URLSearchParams({ pageSize: "100" });
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

async function uploadDocument(
  expenseId: number,
  fileBuffer: ArrayBuffer,
  filename: string,
  mimeType: string,
): Promise<void> {
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

// ─── Description builder ──────────────────────────────────────────────────────

async function buildDescription(
  invoiceDate: string,
  gigPaymentRecords: AirtableRecord[],
  showcasePaymentRecords: AirtableRecord[],
  gigByAirtableId: Map<string, DbGig>,
  personByAirtableId: Map<string, DbPerson>,
  rolesCache: Map<number, AssignedRole[]>,
): Promise<string> {
  // Collect unique gig and showcase Airtable IDs across all linked payments
  const uniqueGigAtIds = new Set<string>();
  for (const p of gigPaymentRecords) {
    for (const id of ids(p.fields["Gig"])) uniqueGigAtIds.add(id);
  }

  const uniqueShowcaseAtIds = new Set<string>();
  for (const p of showcasePaymentRecords) {
    for (const id of ids(p.fields["Showcases"])) uniqueShowcaseAtIds.add(id);
  }

  const totalDistinct = uniqueGigAtIds.size + uniqueShowcaseAtIds.size;

  // Multiple distinct events
  if (totalDistinct > 1) {
    return `multiple gigs - ${invoiceDate}`;
  }

  // Single showcase
  if (uniqueGigAtIds.size === 0 && uniqueShowcaseAtIds.size === 1) {
    const showcaseAtId = [...uniqueShowcaseAtIds][0];
    // Fetch showcase info from DB (by airtable_id mapping)
    const showcases = await callApi<DbShowcase[]>("GET", "/showcases");
    const showcase = showcases.find(s => s.airtableId === showcaseAtId);
    if (showcase) {
      const name = showcase.name ?? "showcase";
      return `showcase - ${showcase.date} - ${name}`;
    }
    return `showcase - ${invoiceDate}`;
  }

  // Single gig
  if (uniqueGigAtIds.size === 1 && uniqueShowcaseAtIds.size === 0) {
    const gigAtId = [...uniqueGigAtIds][0];
    const gig = gigByAirtableId.get(gigAtId);
    if (!gig) return invoiceDate;

    const gigName = gig.name?.trim() || `${gig.firstName} ${gig.lastName}`.trim();

    // Get the date from the first gig payment's Gig Date lookup (already ISO string)
    const firstPayment = gigPaymentRecords[0];
    const gigDate = lookupFirst(firstPayment?.fields["Gig Date"]) ?? gig.date;

    // Resolve roles for the performer
    let roleSegment = "";
    const firstPersonAtId = ids(firstPayment?.fields["person"])[0];
    if (firstPersonAtId) {
      const dbPerson = personByAirtableId.get(firstPersonAtId);
      if (dbPerson) {
        // Fetch and cache roles for this gig
        if (!rolesCache.has(gig.id)) {
          const roles = await callApi<AssignedRole[]>("GET", `/gigs/${gig.id}/roles`);
          rolesCache.set(gig.id, roles);
        }
        const gigRoles = rolesCache.get(gig.id) ?? [];
        const personRoles = gigRoles
          .filter(r => r.personId === dbPerson.id)
          .map(r => r.roleName);
        if (personRoles.length > 0) {
          roleSegment = personRoles.join(" / ") + " - ";
        }
      }
    }

    return `${roleSegment}${gigDate} - ${gigName}`;
  }

  // No linked events at all — fall back to invoice date
  return invoiceDate;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Validate env vars upfront
  const missing = ["AIRTABLE_API_KEY", "API_BASE_URL", "MIGRATION_EMAIL", "MIGRATION_PASSWORD"].filter(
    k => !process.env[k],
  );
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  await login();
  console.log("Authenticated\n");
  console.log("=== Invoice → Expense migration: Airtable → app DB ===\n");

  // ── Load DB state upfront ────────────────────────────────────────────────

  console.log("Loading existing DB state...");

  const dbExpenses = await callApi<DbExpense[]>("GET", "/expenses");
  const existingAirtableIds = new Set(dbExpenses.filter(e => e.airtableId).map(e => e.airtableId!));
  console.log(`  ${dbExpenses.length} expenses in DB (${existingAirtableIds.size} with airtable_id)`);

  const dbGigs = await callApi<DbGig[]>("GET", "/gigs");
  const gigByAirtableId = new Map<string, DbGig>();
  for (const g of dbGigs) {
    if (g.airtableId) gigByAirtableId.set(g.airtableId, g);
  }
  console.log(`  ${dbGigs.length} gigs in DB`);

  const dbPeople = await callApi<DbPerson[]>("GET", "/people");
  const personByAirtableId = new Map<string, DbPerson>();
  for (const p of dbPeople) {
    if (p.airtableId) personByAirtableId.set(p.airtableId, p);
  }
  console.log(`  ${dbPeople.length} people in DB`);

  console.log();

  // ── Fetch Airtable tables ────────────────────────────────────────────────

  console.log("Fetching Airtable tables...");

  const atInvoices = await fetchTable(TABLES.invoices);
  console.log(`  ${atInvoices.length} invoice records`);

  const atGigPayments = await fetchTable(TABLES.gigPayments);
  const gigPaymentById = new Map(atGigPayments.map(r => [r.id, r]));
  console.log(`  ${atGigPayments.length} gig payment records`);

  const atShowcasePayments = await fetchTable(TABLES.showcasePayments);
  const showcasePaymentById = new Map(atShowcasePayments.map(r => [r.id, r]));
  console.log(`  ${atShowcasePayments.length} showcase payment records`);

  console.log();

  // ── Process each invoice ─────────────────────────────────────────────────

  console.log("Processing invoices...\n");

  // Cache for gig roles: DB gig ID → AssignedRole[]
  const rolesCache = new Map<number, AssignedRole[]>();

  let created = 0;
  let skippedAlreadyExists = 0;
  let skippedNoAttachment = 0;
  let skippedNoPayments = 0;
  let failed = 0;

  for (const invoice of atInvoices) {
    const f = invoice.fields;

    // Idempotency: skip if already imported
    if (existingAirtableIds.has(invoice.id)) {
      skippedAlreadyExists++;
      continue;
    }

    // Skip if no attachment
    const attachments = f["Invoice"];
    if (!Array.isArray(attachments) || attachments.length === 0) {
      skippedNoAttachment++;
      console.log(`  - ${invoice.id}: no attachment — skipping`);
      continue;
    }

    const attachment = (attachments as AirtableAttachment[])[0];
    const invoiceDate = typeof f["Date"] === "string" ? f["Date"] : "";

    // Resolve linked payment records
    const linkedGigPaymentIds = ids(f["Gig Payment"]);
    const linkedShowcasePaymentIds = ids(f["Showcase `payment"]);

    const linkedGigPayments = linkedGigPaymentIds
      .map(id => gigPaymentById.get(id))
      .filter((r): r is AirtableRecord => r !== undefined);

    const linkedShowcasePayments = linkedShowcasePaymentIds
      .map(id => showcasePaymentById.get(id))
      .filter((r): r is AirtableRecord => r !== undefined);

    // Sum amounts
    const totalPence =
      linkedGigPayments.reduce((sum, r) => sum + toP(r.fields["amount"]), 0) +
      linkedShowcasePayments.reduce((sum, r) => sum + toP(r.fields["amount"]), 0);

    if (totalPence === 0) {
      skippedNoPayments++;
      console.log(`  - ${invoice.id} (${attachment.filename}): no payments or zero amount — skipping`);
      continue;
    }

    // Recipient: first linked payment's Name (from person)[0]
    const firstPayment = linkedGigPayments[0] ?? linkedShowcasePayments[0];
    const recipientName =
      lookupFirst(firstPayment?.fields["Name (from person)"]) ?? undefined;

    try {
      // Build description
      const description = await buildDescription(
        invoiceDate,
        linkedGigPayments,
        linkedShowcasePayments,
        gigByAirtableId,
        personByAirtableId,
        rolesCache,
      );

      // Create expense
      const expense = await callApi<{ id: number }>("POST", "/expenses", {
        date: invoiceDate || undefined,
        amount: totalPence,
        description,
        recipientName,
        airtableId: invoice.id,
      });

      // Upload PDF
      const fileResp = await fetch(attachment.url);
      if (!fileResp.ok) throw new Error(`HTTP ${fileResp.status} downloading "${attachment.filename}"`);
      const buffer = await fileResp.arrayBuffer();
      await uploadDocument(
        expense.id,
        buffer,
        attachment.filename,
        attachment.type ?? "application/octet-stream",
      );

      console.log(
        `  + expense ${expense.id}: "${description}" £${(totalPence / 100).toFixed(2)}` +
        (recipientName ? ` (${recipientName})` : ""),
      );
      created++;
    } catch (err) {
      console.error(`  x ${invoice.id} (${attachment.filename}): ${(err as Error).message}`);
      failed++;
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log(`
=== Done ===
  Created:               ${created}
  Already in DB:         ${skippedAlreadyExists}
  No attachment:         ${skippedNoAttachment}
  No payments/zero amt:  ${skippedNoPayments}
  Failed:                ${failed}
`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
