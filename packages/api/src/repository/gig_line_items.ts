import { run_query } from "../db/init.js";

export interface GigLineItemRow {
  id: number;
  gig_id: number;
  description: string | null;
  amount: number | null;
}

export async function createGigLineItem(
  gigId: number,
  description: string | null,
  amount: number | null
): Promise<GigLineItemRow> {
  const [row] = await run_query<GigLineItemRow>({
    text: `INSERT INTO gig_line_items (gig_id, description, amount) VALUES ($1, $2, $3) RETURNING id, gig_id, description, amount;`,
    values: [gigId, description, amount],
  });
  return row!;
}

export async function readGigLineItemsByGigId(gigId: number): Promise<GigLineItemRow[]> {
  return run_query<GigLineItemRow>({
    text: `SELECT id, gig_id, description, amount FROM gig_line_items WHERE gig_id = $1 ORDER BY id;`,
    values: [gigId],
  });
}

export async function deleteGigLineItem(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM gig_line_items WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
