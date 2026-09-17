import { run_query, withTransaction } from "../db/init.js";

export interface ServiceGroupRow { id: number; name: string; }
export interface ServiceRow {
  id: number; name: string; description: string | null; price_to_client: number | null;
  extra_fee: number | null; extra_fee_description: string | null; airtable_id: string | null;
  number_of_people: number; profit_margin: number | null; times_used: number; groups: ServiceGroupRow[];
}
export interface ServiceMutationInput { name: string; description?: string; priceToClient?: number; extraFee?: number; extraFeeDescription?: string; groupIds: number[]; airtableId?: string; }

const COLS = `id, name, description, price_to_client, extra_fee, extra_fee_description, airtable_id,
  (SELECT COUNT(*) FROM role_services rs WHERE rs.service_id = services.id)::int AS number_of_people,
  CASE WHEN price_to_client IS NULL THEN NULL ELSE price_to_client - COALESCE((SELECT SUM(r.fee) FROM role_services rs2 JOIN roles r ON r.id = rs2.role_id WHERE rs2.service_id = services.id), 0) END AS profit_margin,
  (SELECT COUNT(*) FROM gig_services gs2 JOIN gigs g2 ON g2.id = gs2.gig_id WHERE gs2.service_id = services.id AND g2.status != 'cancelled')::int AS times_used,
  COALESCE((SELECT json_agg(json_build_object('id', sg.id, 'name', sg.name) ORDER BY sg.name) FROM service_service_groups ssg JOIN service_groups sg ON sg.id = ssg.group_id WHERE ssg.service_id = services.id), '[]') AS groups`;

export async function readServiceGroups(): Promise<ServiceGroupRow[]> {
  return run_query<ServiceGroupRow>({ text: "SELECT id, name FROM service_groups ORDER BY id" });
}
export async function replaceServiceGroups(serviceId: number, groupIds: number[]): Promise<void> {
  await run_query({ text: "DELETE FROM service_service_groups WHERE service_id = $1", values: [serviceId] });
  if (groupIds.length) await run_query({ text: `INSERT INTO service_service_groups (service_id, group_id) SELECT $1, id FROM service_groups WHERE id = ANY($2::int[]) ON CONFLICT DO NOTHING`, values: [serviceId, groupIds] });
}
export async function createService(input: ServiceMutationInput): Promise<ServiceRow> {
  return withTransaction(async () => {
    const [row] = await run_query<ServiceRow>({
      text: `INSERT INTO services (name, description, price_to_client, extra_fee, extra_fee_description, airtable_id)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLS}`,
      values: [input.name, input.description ?? null, input.priceToClient ?? null, input.extraFee ?? null, input.extraFeeDescription ?? null, input.airtableId ?? null],
    });
    await replaceServiceGroups(row.id, input.groupIds);
    return (await readServiceById(row.id))!;
  });
}
export async function readServices(): Promise<ServiceRow[]> {
  return run_query<ServiceRow>({ text: `SELECT ${COLS} FROM services ORDER BY name` });
}
export async function readServiceById(id: number): Promise<ServiceRow | null> {
  const rows = await run_query<ServiceRow>({ text: `SELECT ${COLS} FROM services WHERE id = $1`, values: [id] });
  return rows[0] ?? null;
}
export async function updateService(id: number, input: ServiceMutationInput): Promise<ServiceRow | null> {
  return withTransaction(async () => {
    const rows = await run_query<ServiceRow>({
      text: `UPDATE services
        SET name = $2, description = $3, price_to_client = $4,
            extra_fee = $5, extra_fee_description = $6, airtable_id = $7
        WHERE id = $1 RETURNING ${COLS}`,
      values: [id, input.name, input.description ?? null, input.priceToClient ?? null, input.extraFee ?? null, input.extraFeeDescription ?? null, input.airtableId ?? null],
    });
    if (!rows[0]) return null;
    await replaceServiceGroups(id, input.groupIds);
    return (await readServiceById(id))!;
  });
}
export async function deleteService(id: number): Promise<boolean> { const rows = await run_query<{ id: number }>({ text: "DELETE FROM services WHERE id=$1 RETURNING id", values: [id] }); return rows.length > 0; }
export default { createService, readServices, readServiceById, updateService, deleteService, readServiceGroups, replaceServiceGroups };
