import { run_query } from "../db/init.js";

export interface RefundRow {
  id: number;
  gig_id: number;
  date: string | null;
  amount: number;
  method: string | null;
  description: string | null;
  subtype: string;
}

export interface RefundMutationInput {
  gigId: number;
  date?: string;
  amount: number;
  method?: string;
  description?: string;
  subtype: string;
}

const SELECT_COLS = `id, gig_id, date, amount, method, description, subtype`;

export async function createRefund(input: RefundMutationInput): Promise<RefundRow> {
  const rows = await run_query<RefundRow>({
    text: `
      INSERT INTO refunds (gig_id, date, amount, method, description, subtype)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${SELECT_COLS};
    `,
    values: [input.gigId, input.date ?? null, input.amount, input.method ?? null, input.description ?? null, input.subtype],
  });
  return rows[0]!;
}

export async function readRefundsByGigId(gigId: number): Promise<RefundRow[]> {
  return run_query<RefundRow>({
    text: `SELECT ${SELECT_COLS} FROM refunds WHERE gig_id = $1 ORDER BY date DESC, id DESC;`,
    values: [gigId],
  });
}

export async function readRefundById(id: number): Promise<RefundRow | null> {
  const rows = await run_query<RefundRow>({
    text: `SELECT ${SELECT_COLS} FROM refunds WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateRefund(
  id: number,
  input: RefundMutationInput
): Promise<RefundRow | null> {
  const rows = await run_query<RefundRow>({
    text: `
      UPDATE refunds
      SET gig_id = $1, date = $2, amount = $3, method = $4, description = $5, subtype = $6
      WHERE id = $7
      RETURNING ${SELECT_COLS};
    `,
    values: [input.gigId, input.date ?? null, input.amount, input.method ?? null, input.description ?? null, input.subtype, id],
  });
  return rows[0] ?? null;
}

export async function deleteRefund(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM refunds WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

export async function sumRefundsByGigId(gigId: number): Promise<number> {
  const rows = await run_query<{ total: string }>({
    text: `SELECT COALESCE(SUM(amount), 0)::bigint AS total FROM refunds WHERE gig_id = $1;`,
    values: [gigId],
  });
  return parseInt(rows[0]?.total ?? "0", 10);
}
