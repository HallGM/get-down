import { run_query } from "../db/init.js";
import { SQL_CARD_CHARGES_EXPR } from "./sql-fragments.js";

/**
 * Single source of truth for "is this gig settled?" and the billing-total
 * arithmetic it depends on. Used by the gigs list/detail pages and by the
 * Accounting page — both consume the exact same SQL fragment, so "settled"
 * can never mean two different things in different parts of the app.
 *
 * See `services/ACCOUNTING.md` → "Settled vs unsettled gig" and
 * "Billing total" / "Net received" for the plain-English definitions and the
 * reasoning behind the refund-subtype handling below.
 */

/**
 * The billing arithmetic, aliasless.
 * Assumes `li` (gig_line_items) and `g` (gigs) are in scope.
 * Applies per-item discounts (GREATEST) with overall discount to handle both discount types.
 *
 * billingTotal = discounted line items subtotal + travel cost + card charges
 *                − credit refunds − write-off refunds
 *
 * `credit` and `write_off` both reduce billing total because both represent
 * a reduction in what the client is deemed to owe (a cash goodwill gesture,
 * and a forgiven debt, respectively). `adjustment` refunds do NOT appear here
 * — see `NET_RECEIVED_EXPR` below and services/ACCOUNTING.md for why.
 */
export const BILLING_TOTAL_EXPR = `
  (
    COALESCE(SUM(li.amount * (1.0 - GREATEST(li.discount_percent, g.discount_percent) / 100.0)), 0)::int
    + g.travel_cost
    + COALESCE(${SQL_CARD_CHARGES_EXPR}, 0)
    - COALESCE((SELECT SUM(r.amount) FROM refunds r WHERE r.gig_id = g.id AND r.subtype IN ('credit', 'write_off')), 0)
  )::int
`;

/**
 * Net received, aliasless correlated-subquery form. Requires only alias `g`.
 *
 * netReceived = total paid − credit refunds − adjustment refunds
 *
 * `credit` and `adjustment` both reduce net received because both represent
 * actual cash handed back to the client. `write_off` refunds do NOT appear
 * here — no cash moves for a write-off, so net received is unaffected.
 */
export const NET_RECEIVED_EXPR = `
  (
    COALESCE((SELECT SUM(amount) FROM payments WHERE gig_id = g.id), 0)
    - COALESCE((SELECT SUM(amount) FROM refunds WHERE gig_id = g.id AND subtype IN ('credit', 'adjustment')), 0)
  )::int
`;

/**
 * Self-contained SQL boolean expression (no alias).
 * Requires only alias `g` on the gigs table; uses correlated subqueries only
 * (no lateral joins) so it can be embedded in any query or CTE that already
 * has a `gigs g` reference — including WHERE clauses.
 *
 * A gig is settled when ALL of:
 *   1. Has at least one line item.
 *   2. Billing total > 0 and equals net received exactly (see BILLING_TOTAL_EXPR
 *      and NET_RECEIVED_EXPR above — the refund-subtype handling is intentionally
 *      asymmetric between the two, by design, not a bug: see ACCOUNTING.md).
 *   3. Has at least one assigned role.
 *   4. Every role has a person linked (person_id IS NOT NULL).
 *   5. Every role has a fee allocation linked (fee_allocation_id IS NOT NULL).
 *   6. Every performer's fee allocation meets ONE of:
 *      a. Person is not a partner AND has at least one linked expense, OR
 *      b. Person is a partner AND fee allocation is confirmed (confirmed = true)
 */
export const SETTLED_CONDITION = `
  (
    EXISTS (SELECT 1 FROM gig_line_items WHERE gig_id = g.id)
    AND EXISTS (
      SELECT 1
      FROM (
        SELECT ${BILLING_TOTAL_EXPR} AS billing_total
        FROM gig_line_items li
        WHERE li.gig_id = g.id
      ) AS bt
      WHERE bt.billing_total > 0
        AND bt.billing_total = ${NET_RECEIVED_EXPR}
    )
    AND EXISTS (SELECT 1 FROM assigned_roles WHERE gig_id = g.id)
    AND NOT EXISTS (SELECT 1 FROM assigned_roles WHERE gig_id = g.id AND person_id IS NULL)
    AND NOT EXISTS (SELECT 1 FROM assigned_roles WHERE gig_id = g.id AND fee_allocation_id IS NULL)
    AND NOT EXISTS (
      SELECT 1
      FROM assigned_roles ar
      JOIN fee_allocations fa ON fa.id = ar.fee_allocation_id
      LEFT JOIN people pe ON pe.id = fa.person_id
      WHERE ar.gig_id = g.id
        AND NOT (
          (COALESCE(pe.is_partner, false) = false AND EXISTS (
            SELECT 1 FROM fee_allocations_expenses fae WHERE fae.allocation_id = ar.fee_allocation_id
          ))
          OR
          (COALESCE(pe.is_partner, false) = true AND fa.confirmed = true)
        )
    )
  )
`;

/** `SETTLED_CONDITION` aliased as `is_settled` for use in SELECT lists. */
export const SETTLED_CASE = `${SETTLED_CONDITION} AS is_settled`;

export interface GigSettledStatusRow {
  gig_id: number;
  is_settled: boolean;
}

/** Return the settled status for every gig. */
export async function readGigSettledStatuses(): Promise<GigSettledStatusRow[]> {
  return run_query<GigSettledStatusRow>({
    text: `SELECT g.id AS gig_id, ${SETTLED_CASE} FROM gigs g ORDER BY g.id;`,
  });
}

/** Return the settled status for a single gig. */
export async function readGigSettledStatusById(id: number): Promise<boolean> {
  const rows = await run_query<{ is_settled: boolean }>({
    text: `SELECT ${SETTLED_CASE} FROM gigs g WHERE g.id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0]?.is_settled ?? false;
}
