import { run_query } from "../db/init.js";

export interface GigCounts {
  booked: number;
  performed: number;
}

export interface DrawingRow {
  person_id: number;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  amount: number;
}

type DateBounds = { start: string | null; end: string | null };

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Sum a single-table amount column filtered by a date range.
 * Table name is constrained to a union type — never user-controlled input.
 */
async function readBoundedTotal(
  table: "payments" | "refunds" | "expenses",
  bounds: DateBounds,
): Promise<number> {
  const rows = await run_query<{ total: string }>({
    text: `
      SELECT COALESCE(SUM(amount), 0)::bigint AS total
      FROM ${table}
      WHERE ($1::date IS NULL OR date >= $1)
        AND ($2::date IS NULL OR date <= $2);
    `,
    values: [bounds.start, bounds.end],
  });
  return parseInt(rows[0]!.total, 10);
}

/**
 * Sum payments or refunds for non-cancelled gigs whose gig date falls in
 * the period and has already passed (accrual basis).
 */
async function readEarnedTotal(
  table: "payments" | "refunds",
  bounds: DateBounds,
): Promise<number> {
  const rows = await run_query<{ total: string }>({
    text: `
      SELECT COALESCE(SUM(t.amount), 0)::bigint AS total
      FROM ${table} t
      JOIN gigs g ON g.id = t.gig_id
      WHERE g.status != 'cancelled'
        AND g.date <= CURRENT_DATE
        AND ($1::date IS NULL OR g.date >= $1)
        AND ($2::date IS NULL OR g.date <= $2);
    `,
    values: [bounds.start, bounds.end],
  });
  return parseInt(rows[0]!.total, 10);
}

// ─── Gig counts ───────────────────────────────────────────────────────────────

/**
 * Count non-cancelled gigs in the period (by gig date).
 * "Booked" = not cancelled; "Performed" = not cancelled + date in the past.
 */
export async function readGigCounts(bounds: DateBounds): Promise<GigCounts> {
  const rows = await run_query<{ booked: string; performed: string }>({
    text: `
      SELECT
        COUNT(*) FILTER (
          WHERE status != 'cancelled'
        )::int AS booked,
        COUNT(*) FILTER (
          WHERE status != 'cancelled'
            AND date <= CURRENT_DATE
        )::int AS performed
      FROM gigs
      WHERE ($1::date IS NULL OR date >= $1)
        AND ($2::date IS NULL OR date <= $2);
    `,
    values: [bounds.start, bounds.end],
  });
  const row = rows[0]!;
  return {
    booked: parseInt(row.booked, 10),
    performed: parseInt(row.performed, 10),
  };
}

// ─── Pot income ───────────────────────────────────────────────────────────────

/**
 * Sum all client payments where the payment date falls in the period.
 * No gig-status filter — cancelled gig payments are included (pot behaviour).
 */
export const readPotPayments = (bounds: DateBounds) => readBoundedTotal("payments", bounds);

/**
 * Sum all refunds where the refund date falls in the period.
 * No gig-status filter — refunds for cancelled gigs reduce the pot.
 */
export const readPotRefunds = (bounds: DateBounds) => readBoundedTotal("refunds", bounds);

// ─── Earned income ────────────────────────────────────────────────────────────

/**
 * Sum payments for non-cancelled past gigs whose gig date falls in the period.
 * The gig date, not the payment date, determines the period.
 *
 * Note: payments on cancelled gigs are deliberately excluded here.
 * Retained deposits on cancelled gigs appear only in pot income (by payment
 * date). This may under-report earned income in that edge case; the data model
 * has no cancellation date to correctly attribute them.
 */
export const readEarnedPayments = (bounds: DateBounds) => readEarnedTotal("payments", bounds);

/**
 * Sum refunds for non-cancelled past gigs whose gig date falls in the period.
 */
export const readEarnedRefunds = (bounds: DateBounds) => readEarnedTotal("refunds", bounds);

// ─── Expenses ─────────────────────────────────────────────────────────────────

/**
 * Sum all expenses by invoice/receipt date, regardless of payment status.
 * Expenses with a NULL date are excluded from filtered views (the range
 * predicate naturally excludes NULLs) but included in the all-time view.
 */
export const readExpensesTotal = (bounds: DateBounds) => readBoundedTotal("expenses", bounds);

// ─── Drawings ─────────────────────────────────────────────────────────────────

/**
 * Sum drawing transactions per partner, filtered by transaction date.
 * Sign convention (per migration 027): positive amount = money taken by
 * partner (drawing direction). Returns a positive amount per person.
 *
 * LOWER(at.type) = 'drawing' handles both 'Drawing' (UI constant) and
 * 'drawing' (used in account_ledger view) that may exist in the database.
 */
export async function readDrawings(bounds: DateBounds): Promise<DrawingRow[]> {
  return run_query<DrawingRow>({
    text: `
      SELECT
        p.id          AS person_id,
        p.first_name,
        p.last_name,
        p.display_name,
        COALESCE(SUM(at.amount), 0)::int AS amount
      FROM account_transactions at
      JOIN accounts a ON a.id = at.account_id
      JOIN people   p ON p.id = a.person_id
      WHERE p.is_partner = true
        AND LOWER(at.type) = 'drawing'
        AND ($1::date IS NULL OR at.date >= $1)
        AND ($2::date IS NULL OR at.date <= $2)
      GROUP BY p.id, p.first_name, p.last_name, p.display_name
      HAVING COALESCE(SUM(at.amount), 0) != 0
      ORDER BY p.first_name, p.last_name;
    `,
    values: [bounds.start, bounds.end],
  });
}
