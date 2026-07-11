import type { ExpensesBreakdown } from "@get-down/shared";
import { run_query } from "../db/init.js";
import { PREDICTED_PROFIT_LATERALS, PREDICTED_PROFIT_CASE, SETTLED_CASE, SETTLED_CONDITION } from "./gigs.js";

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

// ─── Expenses breakdown ───────────────────────────────────────────────────────

export interface ExpensesBreakdownRow {
  fee_allocation: string;
  showcase: string;
  other: string;
}

/**
 * Split the date-filtered expenses total into three mutually exclusive buckets:
 *
 *   fee_allocation — expense is linked to a fee allocation on a settled gig.
 *   showcase       — expense is linked to a showcase fee allocation (fa.gig_id IS NULL) OR
 *                    directly via showcase_expenses, but not in the fee_allocation bucket.
 *   other          — expense has no fee allocation link and no showcase link.
 *
 * Expenses linked only to fee allocations on unsettled gigs are invisible: they do not appear
 * in any bucket and do not contribute to the returned totals. They will enter fee_allocation
 * once their gig settles.
 *
 * Priority order (highest wins): settled-gig fee allocation > showcase > other.
 *
 * The three values sum to settled/showcase/unlinked expenses only — not to the grand total
 * of all expenses in the period.
 */
export async function readExpensesBreakdown(bounds: DateBounds): Promise<ExpensesBreakdown> {
  const rows = await run_query<ExpensesBreakdownRow>({
    text: `
      WITH fae_all AS (
        SELECT fae2.expense_id, fa2.gig_id
        FROM fee_allocations_expenses fae2
        JOIN fee_allocations fa2 ON fa2.id = fae2.allocation_id
      )
      SELECT
        COALESCE(SUM(e.amount) FILTER (
          WHERE settled_fae.expense_id IS NOT NULL
        ), 0)::bigint AS fee_allocation,
        COALESCE(SUM(e.amount) FILTER (
          WHERE settled_fae.expense_id IS NULL
            AND showcase_linked.expense_id IS NOT NULL
        ), 0)::bigint AS showcase,
        COALESCE(SUM(e.amount) FILTER (
          WHERE settled_fae.expense_id IS NULL
            AND showcase_linked.expense_id IS NULL
            AND any_gig_fae.expense_id IS NULL
        ), 0)::bigint AS other
      FROM expenses e
      -- Arm 1: expenses linked to fee allocations on settled gigs only
      LEFT JOIN (
        SELECT DISTINCT f.expense_id
        FROM fae_all f
        JOIN gigs g ON g.id = f.gig_id
        WHERE ${SETTLED_CONDITION}
      ) settled_fae ON settled_fae.expense_id = e.id
      -- Arm 2: expenses linked to a showcase, via a showcase fee allocation or directly
      LEFT JOIN (
        SELECT DISTINCT expense_id FROM fae_all WHERE gig_id IS NULL
        UNION
        SELECT DISTINCT expense_id FROM showcase_expenses
      ) showcase_linked ON showcase_linked.expense_id = e.id
      -- Arm 3: expenses linked to any gig fee allocation (settled or unsettled)
      --        used to keep unsettled-only-linked expenses out of the other bucket
      LEFT JOIN (
        SELECT DISTINCT expense_id FROM fae_all WHERE gig_id IS NOT NULL
      ) any_gig_fae ON any_gig_fae.expense_id = e.id
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
 * Sum fee allocation line item amounts per partner, filtered to settled gigs in the period.
 * Only includes allocations for partners (is_partner = true) on non-cancelled settled gigs
 * whose date falls in the period.
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
        AND ${SETTLED_CONDITION}
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
  settledNetReceived:        number;
  predictedBillingUnsettled: number;
  predictedFeeAllocUnsettled: number;
  predictedSharedProfit:     number;
  excludedCount:             number;
}

/**
 * For all non-cancelled gigs in the period:
 *   settledNetReceived        — sum of net received for fully settled gigs.
 *   predictedBillingUnsettled — sum of predicted billing (discounted service subtotal) for
 *                               non-settled gigs where the prediction is available.
 *   predictedFeeAllocUnsettled — sum of predicted role fees for those same gigs.
 *   predictedSharedProfit     — sum of (predicted billing minus role fees) for non-settled gigs
 *                               where the prediction is available.
 *   excludedCount             — count of non-settled gigs whose prediction is unavailable.
 */
export async function readPredictedProfitSummary(bounds: DateBounds): Promise<PredictedProfitSummary> {
  const rows = await run_query<{
    settled_net_received: string;
    predicted_billing_unsettled: string;
    predicted_fee_alloc_unsettled: string;
    predicted_shared_profit: string;
    excluded_count: string;
  }>({
    text: `
      WITH gig_data AS (
        SELECT
          g.id,
          g.date,
          (COALESCE(pmt.total_paid, 0) - COALESCE(rfnd.total_refunded, 0)) AS net_received,
          CASE
            WHEN g.status = 'cancelled' THEN NULL
            WHEN svc.service_count = 0  THEN NULL
            WHEN svc.has_null_price     THEN NULL
            WHEN rls.has_null_fee       THEN NULL
            ELSE ROUND(svc.service_subtotal * (1.0 - g.discount_percent / 100.0))::int
          END AS predicted_billing,
          CASE
            WHEN g.status = 'cancelled' THEN NULL
            WHEN svc.service_count = 0  THEN NULL
            WHEN svc.has_null_price     THEN NULL
            WHEN rls.has_null_fee       THEN NULL
            ELSE COALESCE(rls.role_fee_total, 0)::int
          END AS predicted_fee_alloc,
          ${PREDICTED_PROFIT_CASE},
          ${SETTLED_CASE}
        FROM gigs g
        LEFT JOIN (
          SELECT gig_id, SUM(amount) AS total_paid
          FROM payments GROUP BY gig_id
        ) pmt ON pmt.gig_id = g.id
        LEFT JOIN (
          SELECT gig_id, SUM(amount) AS total_refunded
          FROM refunds WHERE subtype IN ('credit', 'adjustment') GROUP BY gig_id
        ) rfnd ON rfnd.gig_id = g.id
        ${PREDICTED_PROFIT_LATERALS}
        WHERE g.status != 'cancelled'
          AND ($1::date IS NULL OR g.date >= $1)
          AND ($2::date IS NULL OR g.date <= $2)
      )
      SELECT
        COALESCE(SUM(net_received)       FILTER (WHERE is_settled = true), 0)::bigint  AS settled_net_received,
        COALESCE(SUM(predicted_billing)  FILTER (WHERE is_settled = false AND predicted_billing IS NOT NULL), 0)::bigint AS predicted_billing_unsettled,
        COALESCE(SUM(predicted_fee_alloc) FILTER (WHERE is_settled = false AND predicted_fee_alloc IS NOT NULL), 0)::bigint AS predicted_fee_alloc_unsettled,
        COALESCE(SUM(predicted_profit)   FILTER (WHERE is_settled = false AND predicted_profit IS NOT NULL), 0)::bigint AS predicted_shared_profit,
        COALESCE(COUNT(*)                FILTER (WHERE is_settled = false AND predicted_profit IS NULL), 0)::int AS excluded_count
      FROM gig_data;
    `,
    values: [bounds.start, bounds.end],
  });
  const row = rows[0]!;
  return {
    settledNetReceived:         parseInt(row.settled_net_received, 10),
    predictedBillingUnsettled:  parseInt(row.predicted_billing_unsettled, 10),
    predictedFeeAllocUnsettled: parseInt(row.predicted_fee_alloc_unsettled, 10),
    predictedSharedProfit:      parseInt(row.predicted_shared_profit, 10),
    excludedCount:              parseInt(row.excluded_count, 10),
  };
}
