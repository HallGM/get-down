import { run_query } from "../db/init.js";
import { groupById } from "../utils/groupById.js";

export interface AttributionFeeRow {
  id: number;
  attribution_id: number;
  description: string | null;
  date: string | null;
  amount: number | null;
}

export interface AttributionFeeMutationInput {
  attributionId: number;
  description?: string;
  date?: string;
  amount?: number;
}

const SELECT_COLS = `id, attribution_id, description, date, amount`;

export async function createAttributionFee(
  input: AttributionFeeMutationInput
): Promise<AttributionFeeRow> {
  const rows = await run_query<AttributionFeeRow>({
    text: `
      INSERT INTO attribution_fees (attribution_id, description, date, amount)
      VALUES ($1, $2, $3, $4)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.attributionId,
      input.description ?? null,
      input.date ?? null,
      input.amount ?? null,
    ],
  });
  return rows[0];
}

export async function readAttributionFeesByAttributionId(
  attributionId: number
): Promise<AttributionFeeRow[]> {
  return run_query<AttributionFeeRow>({
    text: `SELECT ${SELECT_COLS} FROM attribution_fees WHERE attribution_id = $1 ORDER BY date DESC, id DESC;`,
    values: [attributionId],
  });
}

export async function readAttributionFeeById(id: number): Promise<AttributionFeeRow | null> {
  const rows = await run_query<AttributionFeeRow>({
    text: `SELECT ${SELECT_COLS} FROM attribution_fees WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function readAllAttributionFees(): Promise<AttributionFeeRow[]> {
  return run_query<AttributionFeeRow>({
    text: `SELECT ${SELECT_COLS} FROM attribution_fees ORDER BY date DESC, id DESC;`,
  });
}

export async function updateAttributionFee(
  id: number,
  input: Omit<AttributionFeeMutationInput, "attributionId">
): Promise<AttributionFeeRow | null> {
  const rows = await run_query<AttributionFeeRow>({
    text: `
      UPDATE attribution_fees
      SET description = $1, date = $2, amount = $3
      WHERE id = $4
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.description ?? null,
      input.date ?? null,
      input.amount ?? null,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function deleteAttributionFee(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM attribution_fees WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

// ─── Expense links (attribution_fees_expenses) ─────────────────────────────────

export async function readExpenseIdsByFeeId(feeId: number): Promise<number[]> {
  const rows = await run_query<{ expense_id: number }>({
    text: `SELECT expense_id FROM attribution_fees_expenses WHERE attribution_fee_id = $1 ORDER BY expense_id;`,
    values: [feeId],
  });
  return rows.map((r) => r.expense_id);
}

export async function readExpenseIdsByFeeIds(
  feeIds: number[]
): Promise<Map<number, number[]>> {
  if (feeIds.length === 0) return new Map();
  const rows = await run_query<{ attribution_fee_id: number; expense_id: number }>({
    text: `
      SELECT attribution_fee_id, expense_id
      FROM attribution_fees_expenses
      WHERE attribution_fee_id = ANY($1::int[])
      ORDER BY attribution_fee_id, expense_id;
    `,
    values: [feeIds],
  });
  return groupById(rows, (r) => r.attribution_fee_id, (r) => r.expense_id);
}

export async function linkExpenseToFee(feeId: number, expenseId: number): Promise<void> {
  await run_query({
    text: `
      INSERT INTO attribution_fees_expenses (attribution_fee_id, expense_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `,
    values: [feeId, expenseId],
  });
}

export async function unlinkExpenseFromFee(feeId: number, expenseId: number): Promise<void> {
  await run_query({
    text: `DELETE FROM attribution_fees_expenses WHERE attribution_fee_id = $1 AND expense_id = $2;`,
    values: [feeId, expenseId],
  });
}

// ─── Reverse lookup: fee IDs by expense ID ────────────────────────────────────

export async function readFeeIdsByExpenseId(expenseId: number): Promise<number[]> {
  const rows = await run_query<{ attribution_fee_id: number }>({
    text: `SELECT attribution_fee_id FROM attribution_fees_expenses WHERE expense_id = $1 ORDER BY attribution_fee_id;`,
    values: [expenseId],
  });
  return rows.map((r) => r.attribution_fee_id);
}

export async function readFeeIdsByExpenseIds(
  expenseIds: number[]
): Promise<Map<number, number[]>> {
  if (expenseIds.length === 0) return new Map();
  const rows = await run_query<{ expense_id: number; attribution_fee_id: number }>({
    text: `
      SELECT expense_id, attribution_fee_id
      FROM attribution_fees_expenses
      WHERE expense_id = ANY($1::int[])
      ORDER BY expense_id, attribution_fee_id;
    `,
    values: [expenseIds],
  });
  return groupById(rows, (r) => r.expense_id, (r) => r.attribution_fee_id);
}
