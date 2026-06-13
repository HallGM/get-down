import { run_query } from "../db/init.js";
import { SQL_EVENT_COLS, SQL_SHOWCASE_LATERAL_JOIN, SQL_EVENT_GROUP_BY_COLS } from "./sql-fragments.js";

export interface GigPaymentAlertRow {
  id: number;
  first_name: string;
  last_name: string;
  date: string;
  venue_name: string | null;
  location: string | null;
  total_price: number;
  net_received: number;
}

export interface AllocationAlertRow {
  id: number;
  person_name: string | null;
  event_name: string | null;
  event_date: string | null;
  gig_id: number | null;
  showcase_id: number | null;
  total_fee: number;
}

export interface ApportionmentMismatchRow {
  id: number;
  description: string;
  amount: number;
  apportioned_total: number;
  difference: number;
}

const SELECT_ALERT_COLS = `
  g.id,
  g.first_name,
  g.last_name,
  g.date,
  g.venue_name,
  g.location,
  g.total_price,
  COALESCE(p.total_paid, 0) - COALESCE(r.total_refunded, 0) AS net_received
`;

const PAYMENT_SUBQUERY = `
  LEFT JOIN (
    SELECT gig_id, SUM(amount) AS total_paid FROM payments GROUP BY gig_id
  ) p ON p.gig_id = g.id
  LEFT JOIN (
    SELECT gig_id, SUM(amount) AS total_refunded FROM refunds GROUP BY gig_id
  ) r ON r.gig_id = g.id
`;

/**
 * Confirmed upcoming gigs where no payment has been received at all.
 */
export async function readDepositAlerts(): Promise<GigPaymentAlertRow[]> {
  return run_query<GigPaymentAlertRow>({
    text: `
      SELECT ${SELECT_ALERT_COLS}
      FROM gigs g
      ${PAYMENT_SUBQUERY}
      WHERE g.status = 'confirmed'
        AND g.date >= CURRENT_DATE
        AND g.total_price IS NOT NULL
        AND g.total_price > 0
        AND COALESCE(p.total_paid, 0) - COALESCE(r.total_refunded, 0) = 0
      ORDER BY g.date ASC;
    `,
  });
}

/**
 * Confirmed gigs with a date within the next 2 months that still have
 * an outstanding balance (net received < total price).
 */
export async function readBalanceDueSoonAlerts(): Promise<GigPaymentAlertRow[]> {
  return run_query<GigPaymentAlertRow>({
    text: `
      SELECT ${SELECT_ALERT_COLS}
      FROM gigs g
      ${PAYMENT_SUBQUERY}
      WHERE g.status = 'confirmed'
        AND g.date >= CURRENT_DATE
        AND g.date <= CURRENT_DATE + INTERVAL '2 months'
        AND g.total_price IS NOT NULL
        AND g.total_price > 0
        AND COALESCE(p.total_paid, 0) - COALESCE(r.total_refunded, 0) < g.total_price
      ORDER BY g.date ASC;
    `,
  });
}

/**
 * Fee allocations (gig or showcase) that have no expense linked at all.
 */
export async function readAllocationsWithoutExpenses(): Promise<AllocationAlertRow[]> {
  return run_query<AllocationAlertRow>({
    text: `
      SELECT
        fa.id,
        COALESCE(
          p.display_name,
          p.first_name || COALESCE(' ' || p.last_name, '')
        ) AS person_name,
        ${SQL_EVENT_COLS},
        COALESCE(SUM(li.amount), 0) AS total_fee
      FROM fee_allocations fa
      LEFT JOIN people p ON p.id = fa.person_id
      LEFT JOIN gigs g ON g.id = fa.gig_id
      ${SQL_SHOWCASE_LATERAL_JOIN}
      LEFT JOIN fee_allocation_line_items li ON li.allocation_id = fa.id
      WHERE NOT EXISTS (
        SELECT 1
        FROM fee_allocations_expenses fae
        WHERE fae.allocation_id = fa.id
      )
        AND (fa.person_id IS NULL OR p.is_partner = false)
      GROUP BY
        fa.id,
        p.display_name, p.first_name, p.last_name,
        ${SQL_EVENT_GROUP_BY_COLS}
      ORDER BY COALESCE(g.date, s.date) ASC NULLS LAST;
    `,
  });
}

/**
 * Expenses linked to showcases where explicit apportioned amounts don't sum to
 * the expense total. Only expenses with at least one non-null apportioned amount
 * are considered; expenses where every showcase link has no amount set are ignored.
 */
export async function readApportionmentMismatches(): Promise<ApportionmentMismatchRow[]> {
  return run_query<ApportionmentMismatchRow>({
    text: `
      SELECT
        e.id,
        e.description,
        e.amount::int                                        AS amount,
        SUM(COALESCE(se.apportioned_amount, 0))::int         AS apportioned_total,
        (e.amount - SUM(COALESCE(se.apportioned_amount, 0)))::int AS difference
      FROM expenses e
      JOIN showcase_expenses se ON se.expense_id = e.id
      GROUP BY e.id, e.description, e.amount
      HAVING
        COUNT(*) FILTER (WHERE se.apportioned_amount IS NOT NULL) > 0
        AND SUM(COALESCE(se.apportioned_amount, 0)) <> e.amount
      ORDER BY e.id;
    `,
  });
}
