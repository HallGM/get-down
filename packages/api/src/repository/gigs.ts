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
  timings: string | null;
  contact_number: string | null;
  parking_info: string | null;
  client_notes: string | null;
  performer_notes: string | null;
  playlist_url: string | null;
  end_of_night_song: string | null;
  first_dance_song: string | null;
  first_dance_type: string | null;
  ceilidh: boolean;
  ceilidh_length: string | null;
  ceilidh_style: string | null;
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
  clientNotes?: string;
  performerNotes?: string;
  playlistUrl?: string;
  endOfNightSong?: string;
  firstDanceSong?: string;
  firstDanceType?: string;
  ceilidh?: boolean;
  ceilidhLength?: string;
  ceilidhStyle?: string;
}

const SELECT_COLS = `
  id, enquiry_id, attribution_id, name, status, first_name, last_name,
  partner_name, email, phone, date, venue_name, location, description,
  total_price, travel_cost, discount_percent, airtable_id,
  timings, contact_number, parking_info, client_notes, performer_notes,
  playlist_url, end_of_night_song, first_dance_song, first_dance_type,
  ceilidh, ceilidh_length, ceilidh_style
`;

export async function createGig(input: GigMutationInput): Promise<GigRow> {
  const rows = await run_query<GigRow>({
    text: `
      INSERT INTO gigs (
        enquiry_id, attribution_id, name, status, first_name, last_name,
        partner_name, email, phone, date, venue_name, location, description,
        total_price, travel_cost, discount_percent, airtable_id,
        timings, contact_number, parking_info, client_notes, performer_notes,
        playlist_url, end_of_night_song, first_dance_song, first_dance_type,
        ceilidh, ceilidh_length, ceilidh_style
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
              $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
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
      input.clientNotes ?? null,
      input.performerNotes ?? null,
      input.playlistUrl ?? null,
      input.endOfNightSong ?? null,
      input.firstDanceSong ?? null,
      input.firstDanceType ?? null,
      input.ceilidh ?? false,
      input.ceilidhLength ?? null,
      input.ceilidhStyle ?? null,
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
          timings = $18, contact_number = $19, parking_info = $20, client_notes = $21,
          performer_notes = $22, playlist_url = $23, end_of_night_song = $24,
          first_dance_song = $25, first_dance_type = $26, ceilidh = $27,
          ceilidh_length = $28, ceilidh_style = $29
      WHERE id = $30
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
      input.clientNotes ?? null,
      input.performerNotes ?? null,
      input.playlistUrl ?? null,
      input.endOfNightSong ?? null,
      input.firstDanceSong ?? null,
      input.firstDanceType ?? null,
      input.ceilidh ?? false,
      input.ceilidhLength ?? null,
      input.ceilidhStyle ?? null,
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

export interface UpcomingGigRow {
  id: number;
  date: string;
  first_name: string;
  last_name: string;
  venue_name: string | null;
  location: string | null;
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
