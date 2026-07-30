import { run_query } from "../db/init.js";

export interface GigLineItemRow {
  id: number;
  gig_id: number;
  description: string | null;
  amount: number | null;
  discount_percent: number;
}

export async function createGigLineItem(
  gigId: number,
  description: string | null,
  amount: number | null,
  discountPercent: number = 0
): Promise<GigLineItemRow> {
  const [row] = await run_query<GigLineItemRow>({
    text: `INSERT INTO gig_line_items (gig_id, description, amount, discount_percent) VALUES ($1, $2, $3, $4) RETURNING id, gig_id, description, amount, discount_percent;`,
    values: [gigId, description, amount, discountPercent],
  });
  return row!;
}

export async function readGigLineItemsByGigId(gigId: number): Promise<GigLineItemRow[]> {
  return run_query<GigLineItemRow>({
    text: `SELECT id, gig_id, description, amount, discount_percent FROM gig_line_items WHERE gig_id = $1 ORDER BY id;`,
    values: [gigId],
  });
}

export async function updateGigLineItem(
  id: number,
  gigId: number,
  description: string | null,
  amount: number | null,
  discountPercent: number = 0
): Promise<GigLineItemRow | null> {
  const rows = await run_query<GigLineItemRow>({
    text: `UPDATE gig_line_items SET description = $3, amount = $4, discount_percent = $5 WHERE id = $1 AND gig_id = $2 RETURNING id, gig_id, description, amount, discount_percent;`,
    values: [id, gigId, description, amount, discountPercent],
  });
  return rows[0] ?? null;
}

export async function deleteGigLineItem(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM gig_line_items WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
