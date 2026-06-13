/**
 * Shared SQL fragments reused across repository queries that join fee_allocations
 * to their parent event (gig or showcase via assigned_roles).
 *
 * Assumed aliases in the outer query:
 *   fa    → fee_allocations
 *   g     → gigs (LEFT JOIN via fa.gig_id)
 *   ar_sc / s  → introduced by SQL_SHOWCASE_LATERAL_JOIN
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

/** SELECT expression: person display name, falling back to first + last.
 *  Alias: `person_name`. Requires alias `p` on the `people` table. */
export const SQL_PERSON_NAME = `
  COALESCE(
    p.display_name,
    p.first_name || COALESCE(' ' || p.last_name, '')
  ) AS person_name`;
