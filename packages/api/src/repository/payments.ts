import { run_query } from "../db/init.js";

export interface PaymentRow {
  id: number;
  gig_id: number;
  date: string | null;
  amount: number;
  method: string | null;
  description: string | null;
  airtable_id: string | null;
}

export interface PaymentMutationInput {
  gigId: number;
  date?: string;
  amount: number;
  method?: string;
  description?: string;
  airtableId?: string;
}

const SELECT_COLS = `id, gig_id, date, amount, method, description, airtable_id`;

export async function createPayment(input: PaymentMutationInput): Promise<PaymentRow> {
  const rows = await run_query<PaymentRow>({
    text: `
      INSERT INTO payments (gig_id, date, amount, method, description, airtable_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${SELECT_COLS};
    `,
    values: [input.gigId, input.date ?? null, input.amount, input.method ?? null, input.description ?? null, input.airtableId ?? null],
  });
  return rows[0];
}

export async function readAllPayments(): Promise<PaymentRow[]> {
  return run_query<PaymentRow>({
    text: `SELECT ${SELECT_COLS} FROM payments ORDER BY date DESC, id DESC;`,
  });
}

export async function readPaymentById(id: number): Promise<PaymentRow | null> {
  const rows = await run_query<PaymentRow>({
    text: `SELECT ${SELECT_COLS} FROM payments WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function readPaymentsByGigId(gigId: number): Promise<PaymentRow[]> {
  return run_query<PaymentRow>({
    text: `SELECT ${SELECT_COLS} FROM payments WHERE gig_id = $1 ORDER BY date DESC, id DESC;`,
    values: [gigId],
  });
}

export async function updatePayment(
  id: number,
  input: PaymentMutationInput
): Promise<PaymentRow | null> {
  const rows = await run_query<PaymentRow>({
    text: `
      UPDATE payments
      SET gig_id = $1, date = $2, amount = $3, method = $4, description = $5, airtable_id = $6
      WHERE id = $7
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.gigId,
      input.date ?? null,
      input.amount,
      input.method ?? null,
      input.description ?? null,
      input.airtableId ?? null,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function deletePayment(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM payments WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
