import { run_query } from "../db/init.js";
import { SQL_EVENT_COLS, SQL_SHOWCASE_LATERAL_JOIN, SQL_EVENT_GROUP_BY_COLS, SQL_PERSON_NAME, SQL_PAYMENT_SUBQUERY, SQL_BILLING_CTE_COLS, SQL_GIG_EVENT_NAME, SQL_SHOWCASE_EVENT_NAME } from "./sql-fragments.js";

export interface GigAlertBaseRow {
  id: number;
  first_name: string;
  last_name: string;
  date: string;
  venue_name: string | null;
  location: string | null;
}

export interface GigPaymentAlertRow extends GigAlertBaseRow {
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
  venue_name: string | null;
  location: string | null;
}

export interface ApportionmentMismatchRow {
  id: number;
  description: string;
  amount: number;
  apportioned_total: number;
  difference: number;
}

export interface FeeAllocationExpenseMismatchRow {
  allocation_id: number;
  expense_id: number;
  person_name: string | null;
  event_name: string | null;
  event_date: string | null;
  gig_id: number | null;
  allocation_total: number;
  apportioned_amount: number;
  difference: number;
}

export interface ExpenseOverApportionmentRow {
  id: number;
  description: string;
  amount: number;
  apportioned_total: number;
  difference: number;
}

export interface ExpenseOverApportionmentAllocationRow {
  expense_id: number;
  allocation_id: number;
  gig_id: number;
  person_name: string | null;
  event_name: string;
  event_date: string;
}

export type GigNoLineItemsAlertRow = GigAlertBaseRow;

export interface GigPaymentMismatchAlertRow extends GigAlertBaseRow {
  billing_total: number;
  net_received: number;
  difference: number;
}

export interface RoleWithoutAllocationAlertRow {
  id: number;
  person_name: string;
  role_name: string;
  event_name: string;
  event_date: string;
  gig_id: number | null;
  showcase_id: number | null;
  venue_name: string | null;
  location: string | null;
}

export type EmptyRoleAlertRow = Omit<RoleWithoutAllocationAlertRow, 'person_name'>;

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

/**
 * Confirmed upcoming gigs where no payment has been received at all.
 */
export async function readDepositAlerts(): Promise<GigPaymentAlertRow[]> {
  return run_query<GigPaymentAlertRow>({
    text: `
      SELECT ${SELECT_ALERT_COLS}
      FROM gigs g
      ${SQL_PAYMENT_SUBQUERY}
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
 * an outstanding balance (net received < calculated billing total).
 * Only gigs with at least one billing line item are included.
 */
export async function readBalanceDueSoonAlerts(): Promise<GigPaymentMismatchAlertRow[]> {
  return run_query<GigPaymentMismatchAlertRow>({
    text: `
      WITH billing AS (
        SELECT ${SQL_BILLING_CTE_COLS}
        FROM gigs g
        JOIN gig_line_items li ON li.gig_id = g.id
        ${SQL_PAYMENT_SUBQUERY}
        WHERE g.status = 'confirmed'
          AND g.date >= CURRENT_DATE
          AND g.date <= CURRENT_DATE + INTERVAL '2 months'
        GROUP BY g.id, p.total_paid, r.total_refunded, cr.total_credits
      )
      SELECT
        id,
        first_name,
        last_name,
        date,
        venue_name,
        location,
        billing_total,
        net_received,
        (billing_total - net_received)::int AS difference
      FROM billing
      WHERE billing_total > 0
        AND net_received < billing_total
      ORDER BY date ASC;
    `,
  });
}

/**
 * Fee allocations (gig or showcase) that have no expense linked at all.
 */
export async function readAllocationsWithoutExpenses(): Promise<AllocationAlertRow[]> {
  return run_query<AllocationAlertRow>({
    text: buildAllocationAlertQuery(
      `SELECT 1 FROM fee_allocations_expenses fae WHERE fae.allocation_id = fa.id`,
      `fa.person_id IS NULL OR p.is_partner = false`,
    ),
  });
}

/**
 * Fee allocations that have no assigned_roles row pointing at them.
 * Covers gig allocations, showcase allocations, and fully orphaned allocations.
 * No partner exclusion — all allocations are in scope.
 */
export async function readAllocationsWithoutRoles(): Promise<AllocationAlertRow[]> {
  return run_query<AllocationAlertRow>({
    text: buildAllocationAlertQuery(
      `SELECT 1 FROM assigned_roles ar WHERE ar.fee_allocation_id = fa.id`,
    ),
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

/**
 * Confirmed gigs (past or future) that have no billing line items.
 */
export async function readGigsWithoutLineItems(): Promise<GigNoLineItemsAlertRow[]> {
  return run_query<GigNoLineItemsAlertRow>({
    text: `
      SELECT g.id, g.first_name, g.last_name, g.date, g.venue_name, g.location
      FROM gigs g
      WHERE g.status = 'confirmed'
        AND NOT EXISTS (
          SELECT 1 FROM gig_line_items li WHERE li.gig_id = g.id
        )
      ORDER BY g.date ASC;
    `,
  });
}

/**
 * Confirmed past gigs (date < today) with at least one billing line item where
 * net received (payments minus refunds) does not equal the calculated billing
 * total (sum of line items minus discount plus travel). Returns both
 * underpayments and overpayments, ordered most-recent first.
 */
export async function readPastPaymentMismatches(): Promise<GigPaymentMismatchAlertRow[]> {
  return run_query<GigPaymentMismatchAlertRow>({
    text: `
      WITH gig_totals AS (
        SELECT ${SQL_BILLING_CTE_COLS}
        FROM gigs g
        JOIN gig_line_items li ON li.gig_id = g.id
        ${SQL_PAYMENT_SUBQUERY}
        WHERE g.status = 'confirmed'
          AND g.date < CURRENT_DATE
        GROUP BY g.id, p.total_paid, r.total_refunded, cr.total_credits
      )
      SELECT
        id,
        first_name,
        last_name,
        date,
        venue_name,
        location,
        billing_total,
        net_received,
        (billing_total - net_received)::int AS difference
      FROM gig_totals
      WHERE billing_total <> net_received
      ORDER BY date DESC;
    `,
  });
}

/**
 * Confirmed past gigs (date < today) where a performer role has no fee allocation linked.
 * Only includes roles with a person assigned.
 */
export async function readGigRolesWithoutAllocation(): Promise<RoleWithoutAllocationAlertRow[]> {
  return run_query<RoleWithoutAllocationAlertRow>({
    text: `
      SELECT
        ar.id,
        ${SQL_PERSON_NAME},
        ar.role_name,
        ${SQL_GIG_EVENT_NAME},
        g.date AS event_date,
        g.id AS gig_id,
        NULL::int AS showcase_id,
        g.venue_name,
        g.location
      FROM assigned_roles ar
      JOIN gigs g ON g.id = ar.gig_id
      JOIN people p ON p.id = ar.person_id
      WHERE ar.gig_id IS NOT NULL
        AND ar.fee_allocation_id IS NULL
        AND g.status = 'confirmed'
        AND g.date < CURRENT_DATE
      ORDER BY g.date ASC;
    `,
  });
}

/**
 * Past showcases (date < today) where a performer role has no fee allocation linked.
 * Only includes roles with a person assigned.
 */
export async function readShowcaseRolesWithoutAllocation(): Promise<RoleWithoutAllocationAlertRow[]> {
  return run_query<RoleWithoutAllocationAlertRow>({
    text: `
      SELECT
        ar.id,
        ${SQL_PERSON_NAME},
        ar.role_name,
        ${SQL_SHOWCASE_EVENT_NAME},
        s.date AS event_date,
        NULL::int AS gig_id,
        s.id AS showcase_id,
        NULL::varchar AS venue_name,
        s.location
      FROM assigned_roles ar
      JOIN showcases s ON s.id = ar.showcase_id
      JOIN people p ON p.id = ar.person_id
      WHERE ar.showcase_id IS NOT NULL
        AND ar.fee_allocation_id IS NULL
        AND s.date < CURRENT_DATE
      ORDER BY s.date ASC;
    `,
  });
}

function buildAllocationAlertQuery(notExistsBody: string, extraWhere?: string): string {
  return `
    SELECT
      fa.id,
      ${SQL_PERSON_NAME},
      ${SQL_EVENT_COLS},
      COALESCE(SUM(li.amount), 0) AS total_fee,
      g.venue_name,
      COALESCE(g.location, s.location) AS location
    FROM fee_allocations fa
    LEFT JOIN people p ON p.id = fa.person_id
    LEFT JOIN gigs g ON g.id = fa.gig_id
    ${SQL_SHOWCASE_LATERAL_JOIN}
    LEFT JOIN fee_allocation_line_items li ON li.allocation_id = fa.id
    WHERE NOT EXISTS (${notExistsBody})
    ${extraWhere ? `AND (${extraWhere})` : ""}
    GROUP BY
      fa.id,
      p.display_name, p.first_name, p.last_name,
      ${SQL_EVENT_GROUP_BY_COLS},
      g.venue_name,
      g.location, s.location
    ORDER BY COALESCE(g.date, s.date) ASC NULLS LAST;
  `;
}

/**
 * Confirmed past gigs (date < today) where a performer role has no person assigned.
 */
export async function readEmptyGigRoles(): Promise<EmptyRoleAlertRow[]> {
  return run_query<EmptyRoleAlertRow>({
    text: `
      SELECT
        ar.id,
        ar.role_name,
        ${SQL_GIG_EVENT_NAME},
        g.date AS event_date,
        g.id AS gig_id,
        NULL::int AS showcase_id,
        g.venue_name,
        g.location
      FROM assigned_roles ar
      JOIN gigs g ON g.id = ar.gig_id
      WHERE ar.gig_id IS NOT NULL
        AND ar.person_id IS NULL
        AND g.status = 'confirmed'
        AND g.date < CURRENT_DATE
      ORDER BY g.date ASC;
    `,
  });
}

/**
 * Past showcases (date < today) where a performer role has no person assigned.
 */
export async function readEmptyShowcaseRoles(): Promise<EmptyRoleAlertRow[]> {
  return run_query<EmptyRoleAlertRow>({
    text: `
      SELECT
        ar.id,
        ar.role_name,
        ${SQL_SHOWCASE_EVENT_NAME},
        s.date AS event_date,
        NULL::int AS gig_id,
        s.id AS showcase_id,
        NULL::varchar AS venue_name,
        s.location
      FROM assigned_roles ar
      JOIN showcases s ON s.id = ar.showcase_id
      WHERE ar.showcase_id IS NOT NULL
        AND ar.person_id IS NULL
        AND s.date < CURRENT_DATE
      ORDER BY s.date ASC;
    `,
  });
}

/**
 * Fee allocations linked to gigs where the apportioned amount (or full expense if null)
 * does not exactly match the allocation's line-item total.
 */
export async function readFeeAllocationExpenseMismatches(): Promise<FeeAllocationExpenseMismatchRow[]> {
  return run_query<FeeAllocationExpenseMismatchRow>({
    text: `
      SELECT
        fa.id AS allocation_id,
        fae.expense_id,
        ${SQL_PERSON_NAME},
        ${SQL_GIG_EVENT_NAME},
        g.date AS event_date,
        g.id AS gig_id,
        COALESCE(SUM(li.amount), 0)::int AS allocation_total,
        COALESCE(fae.apportioned_amount, e.amount)::int AS apportioned_amount,
        (COALESCE(SUM(li.amount), 0) - COALESCE(fae.apportioned_amount, e.amount))::int AS difference
      FROM fee_allocations fa
      JOIN fee_allocations_expenses fae ON fae.allocation_id = fa.id
      JOIN expenses e ON e.id = fae.expense_id
      JOIN gigs g ON g.id = fa.gig_id
      LEFT JOIN people p ON p.id = fa.person_id
      LEFT JOIN fee_allocation_line_items li ON li.allocation_id = fa.id
      WHERE fa.gig_id IS NOT NULL
      GROUP BY fa.id, fae.expense_id, fa.person_id, p.display_name, p.first_name, p.last_name, g.id, g.first_name, g.last_name, g.date, fae.apportioned_amount, e.amount
      HAVING COALESCE(SUM(li.amount), 0) <> COALESCE(fae.apportioned_amount, e.amount)
      ORDER BY g.date ASC;
    `,
  });
}

/**
 * Expenses linked to gigs where the sum of apportioned amounts across all gig allocation links
 * exceeds the expense total. Null apportioned amounts are treated as the full expense amount.
 */
export async function readExpenseOverApportioned(): Promise<ExpenseOverApportionmentRow[]> {
  return run_query<ExpenseOverApportionmentRow>({
    text: `
      SELECT
        e.id,
        e.description,
        e.amount::int,
        SUM(COALESCE(fae.apportioned_amount, e.amount))::int AS apportioned_total,
        (SUM(COALESCE(fae.apportioned_amount, e.amount)) - e.amount)::int AS difference
      FROM expenses e
      JOIN fee_allocations_expenses fae ON fae.expense_id = e.id
      JOIN fee_allocations fa ON fa.id = fae.allocation_id
      WHERE fa.gig_id IS NOT NULL
      GROUP BY e.id, e.description, e.amount
      HAVING SUM(COALESCE(fae.apportioned_amount, e.amount)) > e.amount
      ORDER BY e.id;
    `,
  });
}

/**
 * Gig fee allocations linked to the given (over-apportioned) expenses, so the dashboard
 * can show each affected allocation inline for correction.
 */
export async function readAllocationsForOverApportionedExpenses(
  expenseIds: number[]
): Promise<ExpenseOverApportionmentAllocationRow[]> {
  if (expenseIds.length === 0) return [];
  return run_query<ExpenseOverApportionmentAllocationRow>({
    text: `
      SELECT
        fae.expense_id,
        fa.id AS allocation_id,
        fa.gig_id,
        ${SQL_PERSON_NAME},
        ${SQL_GIG_EVENT_NAME},
        g.date AS event_date
      FROM fee_allocations_expenses fae
      JOIN fee_allocations fa ON fa.id = fae.allocation_id
      JOIN gigs g ON g.id = fa.gig_id
      LEFT JOIN people p ON p.id = fa.person_id
      WHERE fae.expense_id = ANY($1::int[])
        AND fa.gig_id IS NOT NULL
      ORDER BY g.date ASC;
    `,
    values: [expenseIds],
  });
}
