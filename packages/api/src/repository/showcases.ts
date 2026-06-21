import { run_query } from "../db/init.js";
import { groupById } from "../utils/groupById.js";

export interface ShowcaseRow {
  id: number;
  attribution_id: number;
  nickname: string | null;
  full_name: string | null;
  date: string;
  location: string | null;
  airtable_id: string | null;
  cost_airtable: number | null;
}

export interface ShowcaseMutationInput {
  attributionId: number;
  nickname?: string;
  fullName?: string;
  date: string;
  location?: string;
  airtableId?: string;
  costAirtable?: number | null;
}

const SELECT_COLS = `id, attribution_id, nickname, full_name, date, location, airtable_id, cost_airtable`;

export async function createShowcase(input: ShowcaseMutationInput): Promise<ShowcaseRow> {
  const rows = await run_query<ShowcaseRow>({
    text: `
      INSERT INTO showcases (attribution_id, nickname, full_name, date, location, airtable_id, cost_airtable)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.attributionId,
      input.nickname ?? null,
      input.fullName ?? null,
      input.date,
      input.location ?? null,
      input.airtableId ?? null,
      input.costAirtable ?? null,
    ],
  });
  return rows[0];
}

export async function readShowcases(): Promise<ShowcaseRow[]> {
  return run_query<ShowcaseRow>({
    text: `SELECT ${SELECT_COLS} FROM showcases ORDER BY date DESC;`,
  });
}

export async function readShowcaseById(id: number): Promise<ShowcaseRow | null> {
  const rows = await run_query<ShowcaseRow>({
    text: `SELECT ${SELECT_COLS} FROM showcases WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateShowcase(
  id: number,
  input: ShowcaseMutationInput
): Promise<ShowcaseRow | null> {
  const rows = await run_query<ShowcaseRow>({
    text: `
      UPDATE showcases
      SET attribution_id = $1, nickname = $2, full_name = $3, date = $4, location = $5,
          airtable_id = $6, cost_airtable = $7
      WHERE id = $8
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.attributionId,
      input.nickname ?? null,
      input.fullName ?? null,
      input.date,
      input.location ?? null,
      input.airtableId ?? null,
      input.costAirtable ?? null,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function readShowcaseByAttributionId(attributionId: number): Promise<ShowcaseRow | null> {
  const rows = await run_query<ShowcaseRow>({
    text: `SELECT ${SELECT_COLS} FROM showcases WHERE attribution_id = $1 LIMIT 1;`,
    values: [attributionId],
  });
  return rows[0] ?? null;
}

export async function deleteShowcase(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM showcases WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

// ─── Expense links (showcase_expenses) ───────────────────────────────────────

export interface ShowcaseExpenseLinkRow {
  showcase_id: number;
  expense_id: number;
  apportioned_amount: number | null;
}

export async function readExpenseLinksByShowcaseId(
  showcaseId: number
): Promise<ShowcaseExpenseLinkRow[]> {
  return run_query<ShowcaseExpenseLinkRow>({
    text: `SELECT showcase_id, expense_id, apportioned_amount FROM showcase_expenses WHERE showcase_id = $1 ORDER BY expense_id;`,
    values: [showcaseId],
  });
}

export async function readExpenseLinksByShowcaseIds(
  showcaseIds: number[]
): Promise<Map<number, ShowcaseExpenseLinkRow[]>> {
  if (showcaseIds.length === 0) return new Map();
  const rows = await run_query<ShowcaseExpenseLinkRow>({
    text: `
      SELECT showcase_id, expense_id, apportioned_amount
      FROM showcase_expenses
      WHERE showcase_id = ANY($1::int[])
      ORDER BY showcase_id, expense_id;
    `,
    values: [showcaseIds],
  });
  return groupById(rows, (r) => r.showcase_id, (r) => r);
}

export async function linkExpenseToShowcase(showcaseId: number, expenseId: number): Promise<void> {
  await run_query({
    text: `
      INSERT INTO showcase_expenses (showcase_id, expense_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `,
    values: [showcaseId, expenseId],
  });
}

export async function unlinkExpenseFromShowcase(showcaseId: number, expenseId: number): Promise<void> {
  await run_query({
    text: `DELETE FROM showcase_expenses WHERE showcase_id = $1 AND expense_id = $2;`,
    values: [showcaseId, expenseId],
  });
}

export async function updateApportionedAmount(
  showcaseId: number,
  expenseId: number,
  amount: number | null
): Promise<void> {
  await run_query({
    text: `UPDATE showcase_expenses SET apportioned_amount = $1 WHERE showcase_id = $2 AND expense_id = $3;`,
    values: [amount, showcaseId, expenseId],
  });
}

// ─── Showcase financial calculations ──────────────────────────────────────────

/**
 * Sum of COALESCE(apportioned_amount, full expense amount) per showcase.
 * Returns a map of showcaseId → total cost in pence.
 */
export async function readShowcaseCalculatedCosts(
  showcaseIds: number[]
): Promise<Map<number, number>> {
  if (showcaseIds.length === 0) return new Map();
  const rows = await run_query<{ showcase_id: number; calculated_cost: string }>({
    text: `
      SELECT se.showcase_id, COALESCE(SUM(COALESCE(se.apportioned_amount, e.amount)), 0)::bigint AS calculated_cost
      FROM showcase_expenses se
      JOIN expenses e ON e.id = se.expense_id
      WHERE se.showcase_id = ANY($1::int[])
      GROUP BY se.showcase_id;
    `,
    values: [showcaseIds],
  });
  return new Map(rows.map((r) => [r.showcase_id, parseInt(r.calculated_cost, 10)]));
}

/**
 * Map of showcaseId → gig_id[] for gigs linked via the shared attribution_id.
 * A gig is linked to a showcase when both share the same attribution record.
 */
export async function readShowcaseGigMappings(
  showcaseIds: number[]
): Promise<Map<number, number[]>> {
  if (showcaseIds.length === 0) return new Map();
  const rows = await run_query<{ showcase_id: number; gig_id: number }>({
    text: `
      SELECT s.id AS showcase_id, g.id AS gig_id
      FROM showcases s
      JOIN gigs g ON g.attribution_id = s.attribution_id
      WHERE s.id = ANY($1::int[]);
    `,
    values: [showcaseIds],
  });
  const map = new Map<number, number[]>();
  for (const row of rows) {
    const existing = map.get(row.showcase_id) ?? [];
    existing.push(row.gig_id);
    map.set(row.showcase_id, existing);
  }
  return map;
}

/**
 * Sum of fee allocation line item amounts for showcase-only allocations
 * (fa.gig_id IS NULL) per showcase. Returns a map of showcaseId → total in pence.
 *
 * The fa.gig_id IS NULL filter ensures gig performer fees (already captured inside
 * each gig's own profit figure) are not double-counted here.
 */
export async function readShowcasePerformerFees(
  showcaseIds: number[]
): Promise<Map<number, number>> {
  if (showcaseIds.length === 0) return new Map();
  const rows = await run_query<{ showcase_id: number; performer_fees: string }>({
    text: `
      SELECT ar.showcase_id, COALESCE(SUM(fali.amount), 0)::bigint AS performer_fees
      FROM assigned_roles ar
      JOIN fee_allocations fa ON fa.id = ar.fee_allocation_id
      JOIN fee_allocation_line_items fali ON fali.allocation_id = fa.id
      WHERE ar.showcase_id = ANY($1::int[]) AND fa.gig_id IS NULL
      GROUP BY ar.showcase_id;
    `,
    values: [showcaseIds],
  });
  return new Map(rows.map((r) => [r.showcase_id, parseInt(r.performer_fees, 10)]));
}

// ─── Gig summaries for the showcase Gigs tab ──────────────────────────────────

export interface ShowcaseGigSummaryRow {
  id: number;
  date: string;
  first_name: string;
  last_name: string;
  status: string;
  total_price: number | null;
}

/**
 * Basic gig rows for all gigs attributed to the given showcase,
 * joined via the shared attribution_id. Used by GET /showcases/:id/gigs.
 */
export async function readGigSummariesByShowcaseId(
  showcaseId: number
): Promise<ShowcaseGigSummaryRow[]> {
  return run_query<ShowcaseGigSummaryRow>({
    text: `
      SELECT g.id, g.date, g.first_name, g.last_name, g.status, g.total_price
      FROM showcases s
      JOIN gigs g ON g.attribution_id = s.attribution_id
      WHERE s.id = $1
      ORDER BY g.date DESC;
    `,
    values: [showcaseId],
  });
}

// ─── Showcase lookup from a gig (for gig detail view) ─────────────────────────

export interface ShowcaseSummaryRow {
  id: number;
  name: string;
}

/**
 * Returns the showcase (id + display name) linked to the given gig
 * via the shared attribution_id, or null if no showcase is linked.
 * The name is resolved in SQL: nickname → full_name → 'Showcase #<id>'.
 */
export async function readShowcaseSummaryByGigId(
  gigId: number
): Promise<ShowcaseSummaryRow | null> {
  const rows = await run_query<ShowcaseSummaryRow>({
    text: `
      SELECT s.id, COALESCE(s.nickname, s.full_name, 'Showcase #' || s.id::text) AS name
      FROM gigs g
      JOIN showcases s ON s.attribution_id = g.attribution_id
      WHERE g.id = $1
      LIMIT 1;
    `,
    values: [gigId],
  });
  return rows[0] ?? null;
}
