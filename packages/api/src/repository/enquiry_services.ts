import { run_query, withTransaction } from "../db/init.js";

export interface EnquiryServiceRow { id: number; name: string; email_rule_key: string | null; usage_count: number; }

const COLS = `es.id, es.name, es.email_rule_key, (SELECT COUNT(*) FROM gig_enquiry_services ges WHERE ges.enquiry_service_id = es.id)::int AS usage_count`;

export async function readAll(): Promise<EnquiryServiceRow[]> {
  return run_query<EnquiryServiceRow>({ text: `SELECT ${COLS} FROM enquiry_services es ORDER BY es.name` });
}
export async function readById(id: number): Promise<EnquiryServiceRow | null> {
  const rows = await run_query<EnquiryServiceRow>({ text: `SELECT ${COLS} FROM enquiry_services es WHERE es.id=$1`, values: [id] });
  return rows[0] ?? null;
}
export async function create(name: string): Promise<EnquiryServiceRow> {
  const [row] = await run_query<{ id: number }>({ text: "INSERT INTO enquiry_services (name) VALUES ($1) RETURNING id", values: [name] });
  return (await readById(row.id))!;
}
export async function update(id: number, name: string): Promise<EnquiryServiceRow | null> {
  await run_query({ text: "UPDATE enquiry_services SET name=$2 WHERE id=$1", values: [id, name] });
  return readById(id);
}
export async function remove(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({ text: "DELETE FROM enquiry_services WHERE id=$1 RETURNING id", values: [id] });
  return rows.length > 0;
}
export async function readGigSelections(gigId: number): Promise<EnquiryServiceRow[]> {
  return run_query<EnquiryServiceRow>({ text: `SELECT ${COLS} FROM enquiry_services es JOIN gig_enquiry_services ges ON ges.enquiry_service_id=es.id WHERE ges.gig_id=$1 ORDER BY es.name`, values: [gigId] });
}
export async function replaceGigSelections(gigId: number, ids: number[]): Promise<void> {
  await withTransaction(async () => {
    await run_query({ text: "DELETE FROM gig_enquiry_services WHERE gig_id=$1", values: [gigId] });
    if (ids.length) await run_query({ text: "INSERT INTO gig_enquiry_services (gig_id, enquiry_service_id) SELECT $1, unnest($2::int[])", values: [gigId, ids] });
  });
}
