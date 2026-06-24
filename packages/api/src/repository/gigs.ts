import { run_query } from "../db/init.js";
import { SQL_ADDITIONAL_CHARGES_EXPR, SQL_PAYMENT_SUBQUERY } from "./sql-fragments.js";

export interface GigRow {
  id: number;
  enquiry_id: number | null;
  attribution_id: number | null;
  name: string | null;
  status: string;
  first_name: string;
  last_name: string;
  partner_name: string | null;
  email: string | null;
  phone: string | null;
  date: string;
  venue_name: string | null;
  location: string | null;
  description: string | null;
  total_price: number | null;
  travel_cost: number;
  discount_percent: number;
  airtable_id: string | null;
  timings: string | null;
  contact_number: string | null;
  parking_info: string | null;
  meal_details: string | null;
  client_notes: string | null;
  performer_notes: string | null;
  playlist_url: string | null;
  end_of_night_song: string | null;
  first_dance_song: string | null;
  first_dance_type: string | null;
  ceilidh: boolean;
  ceilidh_length: string | null;
  ceilidh_style: string | null;
  client_token: string;
  form_saved_at: string | null;
  vimeo_url: string | null;
  dropbox_url: string | null;
  delivery_title: string | null;
}

export interface GigMutationInput {
  enquiryId?: number;
  attributionId?: number;
  name?: string;
  status: string;
  firstName: string;
  lastName: string;
  partnerName?: string;
  email?: string;
  phone?: string;
  date: string;
  venueName?: string;
  location?: string;
  description?: string;
  totalPrice?: number;
  travelCost: number;
  discountPercent: number;
  airtableId?: string;
  timings?: string;
  contactNumber?: string;
  parkingInfo?: string;
  mealDetails?: string;
  clientNotes?: string;
  performerNotes?: string;
  playlistUrl?: string;
  endOfNightSong?: string;
  firstDanceSong?: string;
  firstDanceType?: string;
  ceilidh?: boolean;
  ceilidhLength?: string;
  ceilidhStyle?: string;
  vimeoUrl?: string;
  dropboxUrl?: string;
  deliveryTitle?: string;
}

const SELECT_COLS = `
  id, enquiry_id, attribution_id, name, status, first_name, last_name,
  partner_name, email, phone, date, venue_name, location, description,
  total_price, travel_cost, discount_percent, airtable_id,
  timings, contact_number, parking_info, meal_details, client_notes, performer_notes,
  playlist_url, end_of_night_song, first_dance_song, first_dance_type,
  ceilidh, ceilidh_length, ceilidh_style, client_token, form_saved_at,
  vimeo_url, dropbox_url, delivery_title
`;

export async function createGig(input: GigMutationInput): Promise<GigRow> {
  const rows = await run_query<GigRow>({
    text: `
      INSERT INTO gigs (
        enquiry_id, attribution_id, name, status, first_name, last_name,
        partner_name, email, phone, date, venue_name, location, description,
        total_price, travel_cost, discount_percent, airtable_id,
        timings, contact_number, parking_info, meal_details, client_notes, performer_notes,
        playlist_url, end_of_night_song, first_dance_song, first_dance_type,
        ceilidh, ceilidh_length, ceilidh_style, vimeo_url, dropbox_url, delivery_title
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
              $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.enquiryId ?? null,
      input.attributionId ?? null,
      input.name ?? null,
      input.status,
      input.firstName,
      input.lastName,
      input.partnerName ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.date,
      input.venueName ?? null,
      input.location ?? null,
      input.description ?? null,
      input.totalPrice ?? null,
      input.travelCost,
      input.discountPercent,
      input.airtableId ?? null,
      input.timings ?? null,
      input.contactNumber ?? null,
      input.parkingInfo ?? null,
      input.mealDetails ?? null,
      input.clientNotes ?? null,
      input.performerNotes ?? null,
      input.playlistUrl ?? null,
      input.endOfNightSong ?? null,
      input.firstDanceSong ?? null,
      input.firstDanceType ?? null,
      input.ceilidh ?? false,
      input.ceilidhLength ?? null,
      input.ceilidhStyle ?? null,
      input.vimeoUrl ?? null,
      input.dropboxUrl ?? null,
      input.deliveryTitle ?? null,
    ],
  });
  return rows[0];
}

export async function readGigs(): Promise<GigRow[]> {
  return run_query<GigRow>({
    text: `SELECT ${SELECT_COLS} FROM gigs ORDER BY date DESC;`,
  });
}

export async function readGigById(id: number): Promise<GigRow | null> {
  const rows = await run_query<GigRow>({
    text: `SELECT ${SELECT_COLS} FROM gigs WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateGig(id: number, input: GigMutationInput): Promise<GigRow | null> {
  const rows = await run_query<GigRow>({
    text: `
      UPDATE gigs
      SET enquiry_id = $1, attribution_id = $2, name = $3, status = $4,
          first_name = $5, last_name = $6, partner_name = $7, email = $8, phone = $9,
          date = $10, venue_name = $11, location = $12, description = $13,
          total_price = $14, travel_cost = $15, discount_percent = $16, airtable_id = $17,
          timings = $18, contact_number = $19, parking_info = $20, meal_details = $21,
          client_notes = $22, performer_notes = $23, playlist_url = $24,
          end_of_night_song = $25, first_dance_song = $26, first_dance_type = $27,
          ceilidh = $28, ceilidh_length = $29, ceilidh_style = $30,
          vimeo_url = $31, dropbox_url = $32, delivery_title = $33
      WHERE id = $34
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.enquiryId ?? null,
      input.attributionId ?? null,
      input.name ?? null,
      input.status,
      input.firstName,
      input.lastName,
      input.partnerName ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.date,
      input.venueName ?? null,
      input.location ?? null,
      input.description ?? null,
      input.totalPrice ?? null,
      input.travelCost,
      input.discountPercent,
      input.airtableId ?? null,
      input.timings ?? null,
      input.contactNumber ?? null,
      input.parkingInfo ?? null,
      input.mealDetails ?? null,
      input.clientNotes ?? null,
      input.performerNotes ?? null,
      input.playlistUrl ?? null,
      input.endOfNightSong ?? null,
      input.firstDanceSong ?? null,
      input.firstDanceType ?? null,
      input.ceilidh ?? false,
      input.ceilidhLength ?? null,
      input.ceilidhStyle ?? null,
      input.vimeoUrl ?? null,
      input.dropboxUrl ?? null,
      input.deliveryTitle ?? null,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function deleteGig(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM gigs WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

export interface GigServiceMappingRow {
  gig_id: number;
  service_id: number;
}

export async function readGigServiceMappings(): Promise<GigServiceMappingRow[]> {
  return run_query<GigServiceMappingRow>({
    text: `SELECT gig_id, service_id FROM gig_services ORDER BY gig_id;`,
  });
}

export async function setGigServices(gigId: number, serviceIds: number[]): Promise<void> {
  await run_query({
    text: `DELETE FROM gig_services WHERE gig_id = $1;`,
    values: [gigId],
  });
  if (serviceIds.length === 0) return;
  const placeholders = serviceIds.map((_, i) => `($1, $${i + 2})`).join(", ");
  await run_query({
    text: `INSERT INTO gig_services (gig_id, service_id) VALUES ${placeholders};`,
    values: [gigId, ...serviceIds],
  });
}

export interface GigServiceRow {
  id: number;
  name: string;
  price_to_client: number | null;
  is_band: boolean;
  is_dj_only: boolean;
  requires_meal: boolean;
}

export async function readGigServicesByGigId(gigId: number): Promise<GigServiceRow[]> {
  return run_query<GigServiceRow>({
    text: `
      SELECT s.id, s.name, s.price_to_client, s.is_band, s.is_dj_only, s.requires_meal
      FROM services s
      JOIN gig_services gs ON gs.service_id = s.id
      WHERE gs.gig_id = $1
      ORDER BY s.name;
    `,
    values: [gigId],
  });
}

export async function readGigByClientToken(token: string): Promise<GigRow | null> {
  const rows = await run_query<GigRow>({
    text: `SELECT ${SELECT_COLS} FROM gigs WHERE client_token = $1 LIMIT 1;`,
    values: [token],
  });
  return rows[0] ?? null;
}

export async function touchFormSavedAt(gigId: number): Promise<void> {
  await run_query({
    text: `UPDATE gigs SET form_saved_at = NOW() WHERE id = $1;`,
    values: [gigId],
  });
}

interface EnquiryBriefRow {
  id: number;
  first_name: string;
  last_name: string;
  partner_name: string | null;
  email: string;
  phone: string | null;
  event_date: string | null;
  venue_location: string | null;
}

export async function readEnquiryBrief(enquiryId: number): Promise<EnquiryBriefRow | null> {
  const rows = await run_query<EnquiryBriefRow>({
    text: `
      SELECT id, first_name, last_name, partner_name, email, phone, event_date, venue_location
      FROM enquiries WHERE id = $1 LIMIT 1;
    `,
    values: [enquiryId],
  });
  return rows[0] ?? null;
}

export interface UpcomingGigRow {
  id: number;
  date: string;
  first_name: string;
  last_name: string;
  venue_name: string | null;
  location: string | null;
}

// ─── Predicted profit ─────────────────────────────────────────────────────────

export interface GigPredictedProfitRow {
  gig_id: number;
  predicted_profit: number | null;
}

/**
 * Lateral-subquery SQL fragment that computes predicted_profit for a single
 * gig aliased as `g`.  Returns NULL when:
 *   - the gig is cancelled
 *   - no services are attached
 *   - any attached service has price_to_client IS NULL
 *   - any role linked to those services has fee IS NULL
 *
 * The service_count = 0 guard must precede the BOOL_OR checks because
 * BOOL_OR over an empty set returns NULL (falsy), which would otherwise fall
 * through to ELSE and compute £0 for an unset gig.
 */
export const PREDICTED_PROFIT_LATERALS = `
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)                                        AS service_count,
      BOOL_OR(s.price_to_client IS NULL)              AS has_null_price,
      COALESCE(SUM(s.price_to_client), 0)             AS service_subtotal
    FROM gig_services gs
    JOIN services s ON s.id = gs.service_id
    WHERE gs.gig_id = g.id
  ) svc ON true
  LEFT JOIN LATERAL (
    SELECT
      BOOL_OR(r.fee IS NULL)  AS has_null_fee,
      SUM(r.fee)              AS role_fee_total
    FROM gig_services gs
    JOIN role_services rs ON rs.service_id = gs.service_id
    JOIN roles r ON r.id = rs.role_id
    WHERE gs.gig_id = g.id
  ) rls ON true
`;

export const PREDICTED_PROFIT_CASE = `
  CASE
    WHEN g.status = 'cancelled'  THEN NULL
    WHEN svc.service_count = 0   THEN NULL
    WHEN svc.has_null_price      THEN NULL
    WHEN rls.has_null_fee        THEN NULL
    -- When no roles are attached, BOOL_OR over an empty set returns NULL (falsy),
    -- which falls through to here with role_fee_total = NULL → COALESCE to 0.
    -- Intentional: a service with no roles contributes £0 to role fees, not unavailable.
    ELSE ROUND(
      svc.service_subtotal * (1.0 - g.discount_percent / 100.0)
      - COALESCE(rls.role_fee_total, 0)
    )::int
  END AS predicted_profit
`;

/**
 * Return the predicted profit (in pence) for every gig.
 * NULL means unavailable (cancelled, no services, or a missing price/fee).
 */
export async function readGigPredictedProfits(): Promise<GigPredictedProfitRow[]> {
  return run_query<GigPredictedProfitRow>({
    text: `
      SELECT g.id AS gig_id, ${PREDICTED_PROFIT_CASE}
      FROM gigs g
      ${PREDICTED_PROFIT_LATERALS}
      ORDER BY g.id;
    `,
  });
}

/**
 * Return the predicted profit (in pence) for a single gig.
 * NULL means unavailable.
 */
export async function readGigPredictedProfitById(id: number): Promise<number | null> {
  const rows = await run_query<{ predicted_profit: number | null }>({
    text: `
      SELECT ${PREDICTED_PROFIT_CASE}
      FROM gigs g
      ${PREDICTED_PROFIT_LATERALS}
      WHERE g.id = $1
      LIMIT 1;
    `,
    values: [id],
  });
  return rows[0]?.predicted_profit ?? null;
}

export async function readUpcomingGigsByPersonId(personId: number): Promise<UpcomingGigRow[]> {
  return run_query<UpcomingGigRow>({
    text: `
      SELECT g.id, g.date, g.first_name, g.last_name, g.venue_name, g.location
      FROM gigs g
      JOIN assigned_roles ar ON ar.gig_id = g.id
      WHERE ar.person_id = $1
        AND g.date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY g.date ASC;
    `,
    values: [personId],
  });
}

export interface GigFinancialTotalsRow {
  gig_id: number;
  net_received: number;
  total_fees: number;
  billing_total: number;
}

/**
 * The billing total arithmetic, aliasless.
 * Assumes `li` (gig_line_items) and `g` (gigs) are in scope.
 * Single source of truth — used by both BILLING_TOTAL_SUBQUERY and SETTLED_CONDITION.
 */
const BILLING_TOTAL_EXPR = `
  (
    COALESCE(SUM(li.amount), 0)
    - ROUND(COALESCE(SUM(li.amount), 0) * g.discount_percent::numeric / 100)::int
    + g.travel_cost
    + COALESCE(${SQL_ADDITIONAL_CHARGES_EXPR}, 0)
    - COALESCE((SELECT SUM(r.amount) FROM refunds r WHERE r.gig_id = g.id AND r.subtype = 'credit'), 0)
  )::int
`;

const BILLING_TOTAL_SUBQUERY = `
  (
    SELECT ${BILLING_TOTAL_EXPR}
    FROM gig_line_items li WHERE li.gig_id = g.id
  ) AS billing_total
`;

const FEE_ALLOCATIONS_TOTALS_JOIN = `
  LEFT JOIN (
    SELECT fa.gig_id, SUM(fali.amount) AS total_fees
    FROM fee_allocations fa
    JOIN fee_allocation_line_items fali ON fali.allocation_id = fa.id
    GROUP BY fa.gig_id
  ) fa_totals ON fa_totals.gig_id = g.id
`;

export async function readGigFinancialTotals(): Promise<GigFinancialTotalsRow[]> {
  return run_query<GigFinancialTotalsRow>({
    text: `
      SELECT
        g.id AS gig_id,
        (COALESCE(p.total_paid, 0) - COALESCE(r.total_refunded, 0))::int AS net_received,
        COALESCE(fa_totals.total_fees, 0)::int AS total_fees,
        ${BILLING_TOTAL_SUBQUERY}
      FROM gigs g
      ${SQL_PAYMENT_SUBQUERY}
      ${FEE_ALLOCATIONS_TOTALS_JOIN}
      ORDER BY g.id;
    `,
  });
}

/** Return financial totals for a single gig. Returns null when the gig does not exist. */
export async function readGigFinancialTotalById(id: number): Promise<GigFinancialTotalsRow | null> {
  const rows = await run_query<GigFinancialTotalsRow>({
    text: `
      SELECT
        g.id AS gig_id,
        (COALESCE(p.total_paid, 0) - COALESCE(r.total_refunded, 0))::int AS net_received,
        COALESCE(fa_totals.total_fees, 0)::int AS total_fees,
        ${BILLING_TOTAL_SUBQUERY}
      FROM gigs g
      ${SQL_PAYMENT_SUBQUERY}
      ${FEE_ALLOCATIONS_TOTALS_JOIN}
      WHERE g.id = $1
      LIMIT 1;
    `,
    values: [id],
  });
  return rows[0] ?? null;
}

// ─── Settled status ───────────────────────────────────────────────────────────

/**
 * Self-contained SQL boolean expression (no alias).
 * Requires only alias `g` on the gigs table; uses correlated subqueries only
 * (no lateral joins) so it can be embedded in any query or CTE that already
 * has a `gigs g` reference — including WHERE clauses.
 *
 * A gig is settled when ALL of:
 *   1. Has at least one line item.
 *   2. Billing total > 0 and equals net received exactly.
 *   3. Has at least one assigned role.
 *   4. Every role has a person linked (person_id IS NOT NULL).
 *   5. Every role has a fee allocation linked (fee_allocation_id IS NOT NULL).
 *   6. Every non-partner performer's fee allocation has at least one linked expense.
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
        AND bt.billing_total = (
          COALESCE((SELECT SUM(amount) FROM payments WHERE gig_id = g.id), 0)
          - COALESCE((SELECT SUM(amount) FROM refunds WHERE gig_id = g.id), 0)
        )::int
    )
    AND EXISTS (SELECT 1 FROM assigned_roles WHERE gig_id = g.id)
    AND NOT EXISTS (SELECT 1 FROM assigned_roles WHERE gig_id = g.id AND person_id IS NULL)
    AND NOT EXISTS (SELECT 1 FROM assigned_roles WHERE gig_id = g.id AND fee_allocation_id IS NULL)
    AND NOT EXISTS (
      SELECT 1
      FROM assigned_roles ar
      JOIN fee_allocations fa ON fa.id = ar.fee_allocation_id
      JOIN people pe ON pe.id = fa.person_id
      WHERE ar.gig_id = g.id
        AND pe.is_partner = false
        AND NOT EXISTS (
          SELECT 1 FROM fee_allocations_expenses fae WHERE fae.allocation_id = ar.fee_allocation_id
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
