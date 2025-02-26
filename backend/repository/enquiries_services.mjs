import { run_query } from "../db/init.mjs";

async function createEnquiriesServices(enquiry_id, service_ids) {
  const values = service_ids.map((_, i) => `($1, $${i + 2})`).join(",");

  const query = `INSERT INTO enquiries_services (enquiry_id, service_id) VALUES ${values}`;

  return await run_query({
    text: query,
    values: [enquiry_id, ...service_ids],
  });
}

export default { createEnquiriesServices };
