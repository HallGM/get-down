import { run_query } from "../db/init.js";
import type { Enquiry } from "@get-down/shared";

interface EnquiryRow {
  id: number;
  created_at: Date;
  first_name: string;
  last_name: string;
  partner_name: string | null;
  email: string;
  phone: string | null;
  event_date: Date | null;
  venue_location: string | null;
  other_services: string[] | null;
  message: string | null;
  airtable_id: string | null;
}

interface EnquiryWithServiceRow extends EnquiryRow {
  service_id: number | null;
  service_name: string | null;
}

export async function createEnquiry(enquiry: Enquiry): Promise<{ id: number }[]> {
  const query = {
    text: `
      INSERT INTO enquiries (created_at, first_name, last_name, partner_name, email, phone, event_date, venue_location, other_services, message, airtable_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id;`,
    values: [
      new Date(),
      enquiry.firstName,
      enquiry.lastName,
      enquiry.partnersName || null,
      enquiry.email,
      enquiry.phone || null,
      enquiry.eventDate || null,
      enquiry.venueLocation || null,
      enquiry.otherServices.length > 0 ? enquiry.otherServices : null,
      enquiry.message || null,
      enquiry.airtableId ?? null,
    ],
  };
  return run_query<{ id: number }>(query);
}

export async function readEnquiries(): Promise<EnquiryRow[]> {
  const query = {
    text: `
      SELECT id, created_at, first_name, last_name, partner_name, email, phone, event_date, venue_location, other_services, message, airtable_id 
      FROM enquiries;`,
  };
  return run_query<EnquiryRow>(query);
}

export async function readEnquiriesWithServices(): Promise<EnquiryWithServiceRow[]> {
  const query = {
    text: `
      SELECT 
          e.id, e.created_at, e.first_name, e.last_name,
          e.partner_name, e.email, e.phone, e.event_date, e.venue_location,
          e.other_services, e.message, e.airtable_id, s.id as service_id, s.name as service_name
      FROM enquiries e
      LEFT JOIN enquiries_services es ON e.id = es.enquiry_id
      LEFT JOIN services s ON es.service_id = s.id`,
  };
  return run_query<EnquiryWithServiceRow>(query);
}

export async function deleteEnquiry(id: string | number): Promise<void> {
  const query = {
    text: `DELETE FROM enquiries WHERE id = $1;`,
    values: [id],
  };
  await run_query(query);
}

export default {
  createEnquiry,
  readEnquiries,
  readEnquiriesWithServices,
  deleteEnquiry,
};
