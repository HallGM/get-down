import type { ExpensesBreakdown } from "@get-down/shared";
import { run_query } from "../db/init.js";
import { PREDICTED_PROFIT_LATERALS, PREDICTED_PROFIT_CASE } from "./gigs.js";

export interface GigCounts {
  booked: number;
  performed: number;
}

export interface PartnerFeeAllocationRow {
  person_id: number;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  amount: number;
}

type DateBounds = { start: string | null; end: string | null };

// ─── Private helpers ──────────────────────────────────────────────────────────

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

// ─── Earned income ────────────────────────────────────────────────────────────

/**
 * Sum payments for non-cancelled past gigs whose gig date falls in the period.
 * The gig date, not the payment date, determines the period.
 *
 * Note: payments on cancelled gigs are deliberately excluded here.
 * Retained deposits on cancelled gigs may not be captured; the data model
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
export async function readExpensesTotal(bounds: DateBounds): Promise<number> {
  const rows = await run_query<{ total: string }>({
    text: `
      SELECT COALESCE(SUM(amount), 0)::bigint AS total
      FROM expenses
      WHERE ($1::date IS NULL OR date >= $1)
        AND ($2::date IS NULL OR date <= $2);
    `,
    values: [bounds.start, bounds.end],
  });
  return parseInt(rows[0]!.total, 10);
}

// ─── Expenses breakdown ───────────────────────────────────────────────────────

export interface ExpensesBreakdownRow {
  fee_allocation: string;
  showcase: string;
  other: string;
}

/**
 * Split the date-filtered expenses total into three mutually exclusive buckets:
 *   fee_allocation — expense has at least one row in fee_allocations_expenses
 *   showcase       — expense has a row in showcase_expenses but none in fee_allocations_expenses
 *   other          — expense has no link to either
 *
 * The DISTINCT subqueries prevent double-counting expenses that are linked to
 * multiple fee allocations. Fee allocation takes priority over showcase when
 * an expense appears in both join tables.
 *
 * The three values always sum to the result of readExpensesTotal for the same bounds.
 */
export async function readExpensesBreakdown(bounds: DateBounds): Promise<ExpensesBreakdown> {
  const rows = await run_query<ExpensesBreakdownRow>({
    text: `
      SELECT
        COALESCE(SUM(e.amount) FILTER (
          WHERE fae.expense_id IS NOT NULL
        ), 0)::bigint AS fee_allocation,
        COALESCE(SUM(e.amount) FILTER (
          WHERE fae.expense_id IS NULL AND sce.expense_id IS NOT NULL
        ), 0)::bigint AS showcase,
        COALESCE(SUM(e.amount) FILTER (
          WHERE fae.expense_id IS NULL AND sce.expense_id IS NULL
        ), 0)::bigint AS other
      FROM expenses e
      LEFT JOIN (SELECT DISTINCT expense_id FROM fee_allocations_expenses) fae
        ON fae.expense_id = e.id
      LEFT JOIN (SELECT DISTINCT expense_id FROM showcase_expenses) sce
        ON sce.expense_id = e.id
      WHERE ($1::date IS NULL OR e.date >= $1)
        AND ($2::date IS NULL OR e.date <= $2);
    `,
    values: [bounds.start, bounds.end],
  });
  const row = rows[0]!;
  return {
    feeAllocation: parseInt(row.fee_allocation, 10),
    showcase:      parseInt(row.showcase, 10),
    other:         parseInt(row.other, 10),
  };
}

// ─── Partner fee allocations ──────────────────────────────────────────────────

/**
 * Sum fee allocation line item amounts per partner, filtered by gig date.
 * Only includes allocations for partners (is_partner = true) on non-cancelled
 * gigs whose date falls in the period and has already passed.
 */
export async function readPartnerFeeAllocations(bounds: DateBounds): Promise<PartnerFeeAllocationRow[]> {
  return run_query<PartnerFeeAllocationRow>({
    text: `
      SELECT
        p.id          AS person_id,
        p.first_name,
        p.last_name,
        p.display_name,
        COALESCE(SUM(fali.amount), 0)::int AS amount
      FROM fee_allocations fa
      JOIN fee_allocation_line_items fali ON fali.allocation_id = fa.id
      JOIN people p ON p.id = fa.person_id
      JOIN gigs g ON g.id = fa.gig_id
      WHERE p.is_partner = true
        AND g.status != 'cancelled'
        AND g.date <= CURRENT_DATE
        AND ($1::date IS NULL OR g.date >= $1)
        AND ($2::date IS NULL OR g.date <= $2)
      GROUP BY p.id, p.first_name, p.last_name, p.display_name
      HAVING COALESCE(SUM(fali.amount), 0) != 0
      ORDER BY p.first_name, p.last_name;
    `,
    values: [bounds.start, bounds.end],
  });
}

// ─── Predicted profit summary ─────────────────────────────────────────────────

export interface PredictedProfitSummary {
  actualFromPast:        number;
  predictedFromUpcoming: number;
  excludedCount:         number;
}

/**
 * For all non-cancelled gigs in the period:
 *   actualFromPast        — sum of (net received − fee allocation total) for gigs
 *                           whose date is before today.
 *   predictedFromUpcoming — sum of predicted profit (service subtotal after discount
 *                           minus role fees) for gigs whose date is today or later,
 *                           excluding gigs where the prediction is unavailable.
 *   excludedCount         — count of upcoming gigs whose predicted profit is NULL
 *                           (cancelled already excluded; this flags missing data).
 */
export async function readPredictedProfitSummary(bounds: DateBounds): Promise<PredictedProfitSummary> {
  const rows = await run_query<{ actual_from_past: string; predicted_from_upcoming: string; excluded_count: string }>({
    text: `
      WITH gig_data AS (
        SELECT
          g.id,
          g.date,
          (COALESCE(pmt.total_paid, 0) - COALESCE(rfnd.total_refunded, 0))
            - COALESCE(fa_totals.total_fees, 0)                         AS actual_profit,
          ${PREDICTED_PROFIT_CASE}
        FROM gigs g
        LEFT JOIN (
          SELECT gig_id, SUM(amount) AS total_paid
          FROM payments GROUP BY gig_id
        ) pmt ON pmt.gig_id = g.id
        LEFT JOIN (
          SELECT gig_id, SUM(amount) AS total_refunded
          FROM refunds GROUP BY gig_id
        ) rfnd ON rfnd.gig_id = g.id
        LEFT JOIN (
          SELECT fa.gig_id, SUM(fali.amount) AS total_fees
          FROM fee_allocations fa
          JOIN fee_allocation_line_items fali ON fali.allocation_id = fa.id
          GROUP BY fa.gig_id
        ) fa_totals ON fa_totals.gig_id = g.id
        ${PREDICTED_PROFIT_LATERALS}
        WHERE g.status != 'cancelled'
          AND ($1::date IS NULL OR g.date >= $1)
          AND ($2::date IS NULL OR g.date <= $2)
      )
      SELECT
        COALESCE(SUM(actual_profit)      FILTER (WHERE date <  CURRENT_DATE), 0)::bigint AS actual_from_past,
        COALESCE(SUM(predicted_profit)   FILTER (WHERE date >= CURRENT_DATE AND predicted_profit IS NOT NULL), 0)::bigint AS predicted_from_upcoming,
        COALESCE(COUNT(*)                FILTER (WHERE date >= CURRENT_DATE AND predicted_profit IS NULL), 0)::int AS excluded_count
      FROM gig_data;
    `,
    values: [bounds.start, bounds.end],
  });
  const row = rows[0]!;
  return {
    actualFromPast:        parseInt(row.actual_from_past, 10),
    predictedFromUpcoming: parseInt(row.predicted_from_upcoming, 10),
    excludedCount:         parseInt(row.excluded_count, 10),
  };
}
