/**
 * Shared SQL fragments reused across repository queries.
 *
 * Fee-allocation / event fragments — assumed aliases:
 *   fa    → fee_allocations
 *   g     → gigs (LEFT JOIN via fa.gig_id)
 *   ar_sc / s  → introduced by SQL_SHOWCASE_LATERAL_JOIN
 *
 * Payment fragments (SQL_PAYMENT_SUBQUERY) — assumed aliases:
 *   g     → gigs
 *   p     → payments aggregate (introduced by the subquery)
 *   r     → refunds aggregate  (introduced by the subquery)
 */

/** SELECT columns: event name, date, and IDs for gig/showcase context. */
export const SQL_EVENT_COLS = `
  CASE
    WHEN g.id IS NOT NULL
      THEN g.first_name || ' ' || g.last_name
    WHEN s.id IS NOT NULL
      THEN COALESCE(s.nickname, s.full_name, 'Showcase #' || s.id::text)
    ELSE NULL
  END AS event_name,
  COALESCE(g.date, s.date) AS event_date,
  g.id AS gig_id,
  s.id AS showcase_id`;

/** JOIN fragment: resolves showcase for a fee allocation via assigned_roles. */
export const SQL_SHOWCASE_LATERAL_JOIN = `
  LEFT JOIN LATERAL (
    SELECT ar.showcase_id
    FROM assigned_roles ar
    WHERE ar.fee_allocation_id = fa.id
      AND ar.showcase_id IS NOT NULL
    LIMIT 1
  ) ar_sc ON true
  LEFT JOIN showcases s ON s.id = ar_sc.showcase_id`;

/** GROUP BY columns for the gig/showcase event context. */
export const SQL_EVENT_GROUP_BY_COLS = `
  g.id, g.first_name, g.last_name, g.date,
  s.id, s.nickname, s.full_name, s.date`;

/** Bare COALESCE expression: person display name, falling back to first + last.
 *  No alias — use this when embedding inside a CASE or other expression.
 *  Requires alias `p` on the `people` table. */
export const SQL_PERSON_NAME_EXPR =
  `COALESCE(p.display_name, p.first_name || COALESCE(' ' || p.last_name, ''))`;

/** SELECT expression: person display name, falling back to first + last.
 *  Alias: `person_name`. Requires alias `p` on the `people` table. */
export const SQL_PERSON_NAME = `
  ${SQL_PERSON_NAME_EXPR} AS person_name`;

/**
 * LEFT JOIN subqueries for payment and refund aggregates.
 * Introduces aliases `p` (total_paid), `r` (total_refunded), and `cr` (total_credits).
 * Requires alias `g` on the `gigs` table.
 *
 * `cr.total_credits` — sum of credit-subtype refunds only; used to reduce billing_total
 *                      in SQL_BILLING_CTE_COLS.  Queries that do not use SQL_BILLING_CTE_COLS
 *                      can safely ignore the `cr` alias.
 */
export const SQL_PAYMENT_SUBQUERY = `
  LEFT JOIN (
    SELECT gig_id, SUM(amount) AS total_paid FROM payments GROUP BY gig_id
  ) p ON p.gig_id = g.id
  LEFT JOIN (
    SELECT gig_id, SUM(amount) AS total_refunded FROM refunds GROUP BY gig_id
  ) r ON r.gig_id = g.id
  LEFT JOIN (
    SELECT gig_id, SUM(amount) AS total_credits FROM refunds WHERE subtype = 'credit' GROUP BY gig_id
  ) cr ON cr.gig_id = g.id
`;

/**
 * SELECT columns for a billing CTE.
 * Produces: id, first_name, last_name, date, venue_name, location,
 *           billing_total (line items minus discount plus travel minus credits), net_received.
 * Requires aliases: g (gigs), li (gig_line_items via JOIN), p, r, and cr (SQL_PAYMENT_SUBQUERY).
 * Pair with: GROUP BY g.id, p.total_paid, r.total_refunded, cr.total_credits
 */
export const SQL_BILLING_CTE_COLS = `
  g.id,
  g.first_name,
  g.last_name,
  g.date,
  g.venue_name,
  g.location,
  (
    SUM(COALESCE(li.amount, 0))
    - ROUND(SUM(COALESCE(li.amount, 0)) * g.discount_percent::numeric / 100)::int
    + g.travel_cost
    - COALESCE(cr.total_credits, 0)
  )::int AS billing_total,
  (COALESCE(p.total_paid, 0) - COALESCE(r.total_refunded, 0))::int AS net_received
`;
