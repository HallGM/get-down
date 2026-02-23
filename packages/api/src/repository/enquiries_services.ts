import { run_query } from "../db/init.js";

export async function createEnquiriesServices(
  enquiry_id: number,
  service_ids: (number | string)[]
): Promise<void> {
  if (service_ids.length === 0) return;

  const values = service_ids.map((_, i) => `($1, $${i + 2})`).join(",");
  const query = {
    text: `INSERT INTO enquiries_services (enquiry_id, service_id) VALUES ${values}`,
    values: [enquiry_id, ...service_ids],
  };
  await run_query(query);
}

export default { createEnquiriesServices };
