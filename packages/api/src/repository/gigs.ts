import { run_query } from "../db/init.js";

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
}

const SELECT_COLS = `
  id, enquiry_id, attribution_id, name, status, first_name, last_name,
  partner_name, email, phone, date, venue_name, location, description,
  total_price, travel_cost, discount_percent, airtable_id
`;

export async function createGig(input: GigMutationInput): Promise<GigRow> {
  const rows = await run_query<GigRow>({
    text: `
      INSERT INTO gigs (
        enquiry_id, attribution_id, name, status, first_name, last_name,
        partner_name, email, phone, date, venue_name, location, description,
        total_price, travel_cost, discount_percent, airtable_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
          total_price = $14, travel_cost = $15, discount_percent = $16, airtable_id = $17
      WHERE id = $18
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
}

export async function readGigServicesByGigId(gigId: number): Promise<GigServiceRow[]> {
  return run_query<GigServiceRow>({
    text: `
      SELECT s.id, s.name, s.price_to_client
      FROM services s
      JOIN gig_services gs ON gs.service_id = s.id
      WHERE gs.gig_id = $1
      ORDER BY s.name;
    `,
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
