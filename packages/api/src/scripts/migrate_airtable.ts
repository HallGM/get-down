/**
 * Airtable → PostgreSQL migration script (idempotent upsert).
 *
 * Calls the REST API rather than connecting to Postgres directly, so it
 * can be run against the production service without needing DB credentials.
 * Safe to run multiple times — records are matched by airtable_id and updated
 * (or skipped for entities without a PUT endpoint).
 *
 * Usage:
 *   cd packages/api
 *   pnpm tsx src/scripts/migrate_airtable.ts
 *
 * Required env vars: AIRTABLE_API_KEY, API_BASE_URL, MIGRATION_EMAIL, MIGRATION_PASSWORD
 */

import dotenv from "dotenv";

dotenv.config();

// ─── Airtable config ─────────────────────────────────────────────────────────

const BASE_ID = "appZXteLrpESv7H8X";

const TABLES = {
  services:     "tblahpz5HnVzjAuSj",
  people:       "tblb1mvY5ed3Uoegr",
  songs:        "tblF8qYCklXITKZSG",
  showcases:    "tbl7a51UZUl6Mm1fK",
  recipient:    "tblIgNPC0L10PhpMl",
  expenses:     "tbljLOEDbueq51OTs",
  enquiries:    "tblIF2otYYuZwirXR",
  gigs:         "tbldxbkHiZOEcpkrk",
  rehearsals:   "tblVrEfV206UKPL3G",
  setListItems: "tblLwZ7c6cAIHKSy2",
  gigPayments:  "tblmoq1Xt57MR5p4X",
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
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
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!resp.ok) throw new Error(`Login failed: HTTP ${resp.status} ${await resp.text()}`);
  const body = (await resp.json()) as { token: string };
  jwtToken = body.token;
}

async function callApi<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    throw new Error(`API ${method} ${path} → HTTP ${resp.status}: ${await resp.text()}`);
  }
  if (resp.status === 204 || resp.headers.get("content-length") === "0") return undefined as T;
  const text = await resp.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

// ─── Airtable helpers ─────────────────────────────────────────────────────────

/** Convert pounds (Airtable float) to pennies (DB integer). */
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
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
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

/**
 * Split a full name string into [firstName, lastName].
 * If there is only one word, lastName is "".
 */
function splitName(full: string): [string, string] {
  const s = full.trim();
  const idx = s.indexOf(" ");
  if (idx === -1) return [s || "Unknown", ""];
  return [s.slice(0, idx), s.slice(idx + 1)];
}

/** Safely read an array-of-record-IDs field, defaulting to []. */
function ids(val: unknown): string[] {
  return Array.isArray(val) ? (val as string[]) : [];
}

/** Safely read a string field. */
function str(val: unknown): string | null {
  return typeof val === "string" && val ? val : null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await login();
  console.log("✓ Authenticated\n");

  console.log("=== Airtable → PostgreSQL migration (idempotent) ===\n");

  // ID maps: Airtable record ID → DB primary key
  const serviceMap   = new Map<string, number>();
  const peopleMap    = new Map<string, number>();
  const songMap      = new Map<string, number>();
  const attrMap      = new Map<string, number>(); // AT showcase ID → attribution DB id
  const gigMap       = new Map<string, number>();
  const rehearsalMap = new Map<string, number>();

  // ── 1. Services ────────────────────────────────────────────────────────────
  console.log("→ services");
  const existingServices = await callApi<{ id: number; name: string; airtableId?: string }[]>("GET", "/services");
  const serviceByAirtableId = new Map(existingServices.filter(s => s.airtableId).map(s => [s.airtableId!, s.id]));
  const serviceByName       = new Map(existingServices.map(s => [s.name, s.id]));

  const atServices = await fetchTable(TABLES.services);
  for (const r of atServices) {
    const f = r.fields;
    const name = String(f["Name"] ?? "").trim();
    if (!name) continue;

    const payload = {
      name,
      priceToClient: toP(f["Price (to client)"]) || undefined,
      feePerPerson: toP(f["Fee per person"]) || undefined,
      numberOfPeople: typeof f["Number of People"] === "number" ? f["Number of People"] : undefined,
      extraFee: toP(f["extra fee"]) || undefined,
      extraFeeDescription: str(f["EF description"]) ?? undefined,
      isBand: f["_is_band?"] === true,
      isDj: f["_is_dj"] === true,
      isActive: true,
      airtableId: r.id,
    };

    let dbId = serviceByAirtableId.get(r.id);
    if (dbId !== undefined) {
      await callApi("PUT", `/services/${dbId}`, payload);
    } else {
      const existingNameId = serviceByName.get(name);
      if (existingNameId !== undefined) {
        // Existing service matched by name; update it to add airtableId
        await callApi("PUT", `/services/${existingNameId}`, payload);
        dbId = existingNameId;
      } else {
        const svc = await callApi<{ id: number }>("POST", "/services", payload);
        dbId = svc.id;
      }
    }
    serviceMap.set(r.id, dbId);
  }
  console.log(`   ${atServices.length} records\n`);

  // ── 2. People ───────────────────────────────────────────────────────────────
  console.log("→ people");
  const existingPeople = await callApi<{ id: number; email?: string; airtableId?: string }[]>("GET", "/people");
  const peopleByAirtableId = new Map(existingPeople.filter(p => p.airtableId).map(p => [p.airtableId!, p.id]));
  const existingByEmail    = new Map(existingPeople.filter(p => p.email).map(p => [p.email!, p.id]));

  const atPeople = await fetchTable(TABLES.people);
  for (const r of atPeople) {
    const f = r.fields;
    const [firstName, lastName] = splitName(String(f["Name"] ?? ""));
    const email = str(f["Email"])?.trim().toLowerCase() ?? undefined;

    const payload = {
      firstName,
      lastName: lastName || undefined,
      email,
      phone: str(f["Phone"]) ?? undefined,
      isPartner: false,
      isActive: true,
      airtableId: r.id,
    };

    let personId = peopleByAirtableId.get(r.id);
    if (personId !== undefined) {
      await callApi("PUT", `/people/${personId}`, payload);
    } else if (email && existingByEmail.has(email)) {
      personId = existingByEmail.get(email)!;
      await callApi("PUT", `/people/${personId}`, payload);
    } else {
      const person = await callApi<{ id: number }>("POST", "/people", payload);
      personId = person.id;
      if (email) existingByEmail.set(email, personId);
    }
    peopleMap.set(r.id, personId);
  }
  console.log(`   ${atPeople.length} records\n`);

  // ── 3. Songs ────────────────────────────────────────────────────────────────
  console.log("→ songs");
  const existingSongs = await callApi<{ id: number; airtableId?: string }[]>("GET", "/songs");
  const songsByAirtableId = new Map(existingSongs.filter(s => s.airtableId).map(s => [s.airtableId!, s.id]));

  const atSongs = await fetchTable(TABLES.songs);
  for (const r of atSongs) {
    const f = r.fields;
    const title = String(f["Title"] ?? "").trim();
    if (!title) continue;

    const payload = {
      title,
      artist: str(f["Artist"]) ?? undefined,
      genre: str(f["Genre"]) ?? undefined,
      musicalKey: str(f["Key"]) ?? undefined,
      airtableId: r.id,
    };

    const existingId = songsByAirtableId.get(r.id);
    if (existingId !== undefined) {
      await callApi("PUT", `/songs/${existingId}`, payload);
      songMap.set(r.id, existingId);
    } else {
      const song = await callApi<{ id: number }>("POST", "/songs", payload);
      songMap.set(r.id, song.id);
    }
  }
  console.log(`   ${atSongs.length} records\n`);

  // ── 4. Attributions + Showcases (from Airtable "Showcases" table) ──────────
  console.log("→ attributions / showcases");
  const existingAttrs = await callApi<{ id: number; airtableId?: string }[]>("GET", "/attributions");
  const attrsByAirtableId = new Map(existingAttrs.filter(a => a.airtableId).map(a => [a.airtableId!, a.id]));
  const existingShowcases = await callApi<{ id: number; airtableId?: string }[]>("GET", "/showcases");
  const showcasesByAirtableId = new Map(existingShowcases.filter(s => s.airtableId).map(s => [s.airtableId!, s.id]));

  const atShowcases = await fetchTable(TABLES.showcases);
  for (const r of atShowcases) {
    const f = r.fields;
    const isShowcase = (f["type"] as string) === "Showcase";
    const attrType   = isShowcase ? "showcase" : "referral";
    const name       = String(f["Full Name"] ?? f["Nickname"] ?? "Unknown");

    const attrPayload = { name, type: attrType, airtableId: r.id };
    let attrId = attrsByAirtableId.get(r.id);
    if (attrId !== undefined) {
      await callApi("PUT", `/attributions/${attrId}`, attrPayload);
    } else {
      const attr = await callApi<{ id: number }>("POST", "/attributions", attrPayload);
      attrId = attr.id;
    }
    attrMap.set(r.id, attrId);

    if (isShowcase && f["Date"]) {
      const showcasePayload = {
        attributionId: attrId,
        nickname: str(f["Nickname"]) ?? undefined,
        fullName: str(f["Full Name"]) ?? undefined,
        name,
        date: f["Date"] as string,
        airtableId: r.id,
      };
      const existingShowcaseId = showcasesByAirtableId.get(r.id);
      if (existingShowcaseId !== undefined) {
        await callApi("PUT", `/showcases/${existingShowcaseId}`, showcasePayload);
      } else {
        await callApi("POST", "/showcases", showcasePayload);
      }
    }
  }
  console.log(`   ${atShowcases.length} records\n`);

  // ── 5. Recipient name lookup (used to resolve Expenses.Recipient) ───────────
  console.log("→ recipients (lookup only)");
  const recipientNames = new Map<string, string>();
  const atRecipients = await fetchTable(TABLES.recipient);
  for (const r of atRecipients) {
    recipientNames.set(r.id, String(r.fields["Name"] ?? ""));
  }
  console.log(`   ${atRecipients.length} records\n`);

  // ── 6. Expenses ─────────────────────────────────────────────────────────────
  console.log("→ expenses");
  const existingExpenses = await callApi<{ id: number; airtableId?: string }[]>("GET", "/expenses");
  const expensesByAirtableId = new Map(existingExpenses.filter(e => e.airtableId).map(e => [e.airtableId!, e.id]));

  const atExpenses = await fetchTable(TABLES.expenses);
  for (const r of atExpenses) {
    const f = r.fields;
    let recipientName: string | undefined;
    const rRaw = f["Recipient"];
    if (typeof rRaw === "string") {
      recipientName = rRaw || undefined;
    } else if (Array.isArray(rRaw) && rRaw.length > 0) {
      recipientName = recipientNames.get(rRaw[0] as string) ?? undefined;
    }

    const payload = {
      date: str(f["Date"]) ?? undefined,
      amount: toP(f["Cost"]),
      description: String(f["Reference"] ?? f["description"] ?? "").trim() || recipientName || "(no description)",
      recipientName,
      paymentMethod: str(f["Payment Method"]) ?? undefined,
      airtableId: r.id,
    };

    const existingId = expensesByAirtableId.get(r.id);
    if (existingId !== undefined) {
      await callApi("PUT", `/expenses/${existingId}`, payload);
    } else {
      await callApi("POST", "/expenses", payload);
    }
  }
  console.log(`   ${atExpenses.length} records\n`);

  // ── 7. Enquiries ────────────────────────────────────────────────────────────
  console.log("→ enquiries");
  const existingEnquiries = await callApi<{ id: number; airtableId?: string }[]>("GET", "/enquiries");
  const enquiriesByAirtableId = new Set(existingEnquiries.filter(e => e.airtableId).map(e => e.airtableId!));

  const atEnquiries = await fetchTable(TABLES.enquiries);
  let enquiriesSkipped = 0;
  for (const r of atEnquiries) {
    if (enquiriesByAirtableId.has(r.id)) {
      enquiriesSkipped++;
      continue;
    }
    const f = r.fields;
    const firstName = String(f["First Name"] ?? "").trim();
    if (!firstName) continue;
    await callApi("POST", "/enquiry", {
      firstName,
      lastName: String(f["Last Name"] ?? ""),
      email: str(f["Email"]) ?? "",
      phone: str(f["phone"]) ?? undefined,
      eventDate: str(f["Event Date"]) ?? undefined,
      venueLocation: str(f["Venue Location"]) ?? undefined,
      message: str(f["Message (optional)"]) ?? undefined,
      services: [],
      airtableId: r.id,
    });
  }
  console.log(`   ${atEnquiries.length} records (${enquiriesSkipped} skipped as already migrated)\n`);

  // ── 8. Gigs (+ gig_services + assigned_roles) ───────────────────────────────
  console.log("→ gigs");
  const existingGigs = await callApi<{ id: number; airtableId?: string }[]>("GET", "/gigs");
  const gigsByAirtableId = new Map(existingGigs.filter(g => g.airtableId).map(g => [g.airtableId!, g.id]));

  const atGigs = await fetchTable(TABLES.gigs);
  for (const r of atGigs) {
    const f = r.fields;
    const date = str(f["Date"]);
    if (!date) continue;

    const [firstName, lastName] = splitName(String(f["Client Name(s)"] ?? "Unknown"));
    const gigFirstName = firstName || "Unknown";
    const gigLastName  = lastName  || "-";
    const attrIds = ids(f["Attribution"]);
    const attributionId = attrIds[0] ? (attrMap.get(attrIds[0]) ?? undefined) : undefined;
    const status = f["Cancelled?"] === true ? "cancelled" : "confirmed";

    const totalPrice  = toP(f["Total Charge (actual)"] ?? f["Total Charge"] ?? 0);
    const depositPaid = toP(f["Deposit Amount"] ?? 0);
    const balance =
      typeof f["Balance Amount"] === "number"
        ? toP(f["Balance Amount"])
        : Math.max(0, totalPrice - depositPaid);
    const travelCost     = toP(f["Travel"] ?? 0);
    const discountPercent = Math.round(
      (typeof f["Discount"] === "number" ? f["Discount"] : 0) * 100
    );

    const gigPayload = {
      firstName: gigFirstName,
      lastName: gigLastName,
      email: str(f["Email"]) ?? undefined,
      date,
      venueName: str(f["Venue"]) ?? undefined,
      description: str(f["description"]) ?? undefined,
      totalPrice,
      depositPaid,
      balanceAmount: balance,
      travelCost,
      discountPercent,
      attributionId,
      status,
      airtableId: r.id,
    };

    let gigId = gigsByAirtableId.get(r.id);
    if (gigId !== undefined) {
      await callApi("PUT", `/gigs/${gigId}`, gigPayload);
    } else {
      const gig = await callApi<{ id: number }>("POST", "/gigs", gigPayload);
      gigId = gig.id;
    }
    gigMap.set(r.id, gigId);

    // gig_services — always re-sync (idempotent via DELETE+INSERT in API)
    const serviceIds = ids(f["Options"])
      .map((optId) => serviceMap.get(optId))
      .filter((id): id is number => id !== undefined);
    await callApi("PUT", `/gigs/${gigId}/services`, { serviceIds });

    // assigned_roles — always re-sync: delete existing then reinsert
    const existingRoles = await callApi<{ id: number }[]>("GET", `/gigs/${gigId}/roles`);
    for (const role of existingRoles) {
      await callApi("DELETE", `/assigned-roles/${role.id}`);
    }
    for (const pId of ids(f["Performers"])) {
      const personId = peopleMap.get(pId);
      if (personId) {
        await callApi("POST", "/assigned-roles", { gigId, personId, roleName: "Performer" });
      }
    }
  }
  console.log(`   ${atGigs.length} records\n`);

  // ── 9. Rehearsals ──────────────────────────────────────────────────────────
  console.log("→ rehearsals");
  const existingRehearsals = await callApi<{ id: number; airtableId?: string }[]>("GET", "/rehearsals");
  const rehearsalsByAirtableId = new Map(existingRehearsals.filter(r => r.airtableId).map(r => [r.airtableId!, r.id]));

  const atRehearsals = await fetchTable(TABLES.rehearsals);
  for (const r of atRehearsals) {
    const f = r.fields;
    const date = str(f["Date"]);
    if (!date) continue;

    const location = str(f["Location"]);
    const gigIds = ids(f["Gigs"])
      .map((gId) => gigMap.get(gId))
      .filter((id): id is number => id !== undefined);

    const payload = {
      name: location ?? date,
      date,
      location: location ?? undefined,
      cost: toP(f["Cost"] ?? 0) || undefined,
      gigIds: gigIds.length > 0 ? gigIds : undefined,
      airtableId: r.id,
    };

    const existingId = rehearsalsByAirtableId.get(r.id);
    if (existingId !== undefined) {
      await callApi("PUT", `/rehearsals/${existingId}`, payload);
      rehearsalMap.set(r.id, existingId);
    } else {
      const rehearsal = await callApi<{ id: number }>("POST", "/rehearsals", payload);
      rehearsalMap.set(r.id, rehearsal.id);
    }
  }
  console.log(`   ${atRehearsals.length} records\n`);

  // ── 10. Set list items ──────────────────────────────────────────────────────
  console.log("→ set_list_items");
  const atSetList = await fetchTable(TABLES.setListItems);
  let setListInserted = 0;
  for (const r of atSetList) {
    const f = r.fields;
    const gigAirtableIds  = ids(f["Gigs"]);
    const songAirtableIds = ids(f["Songs"]);
    if (!gigAirtableIds.length || !songAirtableIds.length) continue;

    const gigId  = gigMap.get(gigAirtableIds[0]);
    const songId = songMap.get(songAirtableIds[0]);
    if (!gigId || !songId) continue;

    const position =
      typeof f["order"] === "number" ? Math.round(f["order"]) : undefined;
    await callApi("POST", `/gigs/${gigId}/set-list`, { songId, position });
    setListInserted++;
  }
  console.log(`   ${setListInserted} / ${atSetList.length} records inserted\n`);

  // ── 11. Gig payments → payments table ──────────────────────────────────────
  console.log("→ gig payments (performer fees)");
  const existingPayments = await callApi<{ id: number; airtableId?: string }[]>("GET", "/payments");
  const paymentsByAirtableId = new Map(existingPayments.filter(p => p.airtableId).map(p => [p.airtableId!, p.id]));

  const atGigPayments = await fetchTable(TABLES.gigPayments);
  let paymentsInserted = 0;
  for (const r of atGigPayments) {
    const f = r.fields;
    const gigAirtableIds = ids(f["Gig"]);
    if (!gigAirtableIds.length) continue;

    const gigId = gigMap.get(gigAirtableIds[0]);
    if (!gigId) continue;

    const amount    = toP(f["amount"]);
    const dateArr   = f["Gig Date"] as string[] | undefined;
    const date      = Array.isArray(dateArr) ? (dateArr[0] ?? undefined) : undefined;
    const nameArr   = f["Name (from person)"] as unknown[] | undefined;
    const personName = Array.isArray(nameArr) && nameArr[0] != null
      ? String(nameArr[0])
      : null;
    const description = personName ? `Performer fee: ${personName}` : "Performer fee";

    const payload = { gigId, date, amount, description, airtableId: r.id };

    const existingId = paymentsByAirtableId.get(r.id);
    if (existingId !== undefined) {
      await callApi("PUT", `/payments/${existingId}`, payload);
    } else {
      await callApi("POST", "/payments", payload);
      paymentsInserted++;
    }
  }
  console.log(`   ${paymentsInserted} new / ${atGigPayments.length} total records\n`);

  console.log("=== Migration complete ===");
  void rehearsalMap; // suppress unused warning
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});


