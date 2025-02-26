import { run_query } from "../db/init.mjs";

export default {
  createEnquiry: async function (enquiry) {
    const query = `
      INSERT INTO enquiries (created_at, first_name, last_name, partner_name, email, phone, event_date, venue_location, other_services, message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id;`;
    return await run_query({
      text: query,
      values: [
        new Date(),
        enquiry.firstName,
        enquiry.lastName,
        enquiry.partnersName,
        enquiry.email,
        enquiry.phone,
        enquiry.eventDate,
        enquiry.venueLocation,
        enquiry.otherServices,
        enquiry.message,
      ],
    });
  },

  readEnquiries: async function () {
    const query = `
      SELECT id, created_at, first_name, last_name, partners_name, email, phone, event_date, venue_location, services, other_services, message 
      FROM enquiries;`;
    return await run_query({ text: query });
  },

  readEnquiriesWithServices: async function () {
    const query = `
      SELECT 
          e.id as enquiry_id,
          e.created_at,
          e.first_name,
          e.last_name,
          e.partner_name,
          e.email,
          e.phone,
          e.event_date,
          e.venue_location,
          e.other_services,
          e.message,
          s.id as service_id,
          s.name as service_name
      FROM enquiries e
      LEFT JOIN enquiries_services es ON e.id = es.enquiry_id
      LEFT JOIN services s ON es.service_id = s.id`;

    return await run_query({ text: query });
  },

  deleteEnquiry: async function (id) {
    const query = `
      DELETE FROM enquiries
      WHERE id = $1;`;
    return await run_query({ text: query, values: [id] });
  },
};
