import { run_query } from "../db/init.js";
import { groupById } from "../utils/groupById.js";

export interface ExpenseRow {
  id: number;
  date: string | null;
  amount: number;
  description: string;
  category: string | null;
  recipient_name: string | null;
  airtable_id: string | null;
  document_key: string | null;
  is_tax_only: boolean;
}

export interface ExpenseMutationInput {
  date?: string;
  amount: number;
  description: string;
  category?: string;
  recipientName?: string;
  airtableId?: string;
  isTaxOnly?: boolean;
}

const SELECT_COLS = `id, date, amount, description, category, recipient_name, airtable_id, document_key, is_tax_only`;

export async function createExpense(input: ExpenseMutationInput): Promise<ExpenseRow> {
  const rows = await run_query<ExpenseRow>({
    text: `
      INSERT INTO expenses (date, amount, description, category, recipient_name, airtable_id, is_tax_only)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.date ?? null,
      input.amount,
      input.description,
      input.category ?? null,
      input.recipientName ?? null,
      input.airtableId ?? null,
      input.isTaxOnly ?? false,
    ],
  });
  return rows[0];
}

export async function readAllExpenses(): Promise<ExpenseRow[]> {
  return run_query<ExpenseRow>({
    text: `SELECT ${SELECT_COLS} FROM expenses ORDER BY date DESC, id DESC;`,
  });
}

export async function readExpenseById(id: number): Promise<ExpenseRow | null> {
  const rows = await run_query<ExpenseRow>({
    text: `SELECT ${SELECT_COLS} FROM expenses WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateExpense(
  id: number,
  input: ExpenseMutationInput
): Promise<ExpenseRow | null> {
  const rows = await run_query<ExpenseRow>({
    text: `
      UPDATE expenses
      SET date = $1, amount = $2, description = $3, category = $4,
          recipient_name = $5, airtable_id = $6, is_tax_only = $7
      WHERE id = $8
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.date ?? null,
      input.amount,
      input.description,
      input.category ?? null,
      input.recipientName ?? null,
      input.airtableId ?? null,
      input.isTaxOnly ?? false,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function setExpenseDocumentKey(id: number, key: string | null): Promise<void> {
  await run_query({
    text: `UPDATE expenses SET document_key = $1 WHERE id = $2;`,
    values: [key, id],
  });
}

export async function hasPayments(expenseId: number): Promise<boolean> {
  const rows = await run_query<{ count: number }>({
    text: `SELECT COUNT(*)::int AS count FROM expense_payments WHERE expense_id = $1;`,
    values: [expenseId],
  });
  return rows[0]?.count > 0;
}

export async function deleteExpense(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM expenses WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

// ─── Allocation links (fee_allocations_expenses, read-side) ───────────────────

export async function readAllocationIdsByExpenseId(expenseId: number): Promise<number[]> {
  const rows = await run_query<{ allocation_id: number }>({
    text: `SELECT allocation_id FROM fee_allocations_expenses WHERE expense_id = $1 ORDER BY allocation_id;`,
    values: [expenseId],
  });
  return rows.map((r) => r.allocation_id);
}

export async function readAllocationIdsByExpenseIds(
  expenseIds: number[]
): Promise<Map<number, number[]>> {
  if (expenseIds.length === 0) return new Map();
  const rows = await run_query<{ expense_id: number; allocation_id: number }>({
    text: `
      SELECT expense_id, allocation_id
      FROM fee_allocations_expenses
      WHERE expense_id = ANY($1::int[])
      ORDER BY expense_id, allocation_id;
    `,
    values: [expenseIds],
  });
  return groupById(rows, (r) => r.expense_id, (r) => r.allocation_id);
}

// ─── Attribution fee links (attribution_fees_expenses, read-side) ──────────────

export async function readAttributionFeeIdsByExpenseId(expenseId: number): Promise<number[]> {
  const rows = await run_query<{ attribution_fee_id: number }>({
    text: `SELECT attribution_fee_id FROM attribution_fees_expenses WHERE expense_id = $1 ORDER BY attribution_fee_id;`,
    values: [expenseId],
  });
  return rows.map((r) => r.attribution_fee_id);
}

export async function readAttributionFeeIdsByExpenseIds(
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

// ─── Card charge link (read-side) ────────────────────────────────────────────

export async function readCardChargeByExpenseId(
  expenseId: number
): Promise<{ id: number; invoice_id: number; gig_id: number } | null> {
  const rows = await run_query<{ id: number; invoice_id: number; gig_id: number }>({
    text: `
      SELECT icc.id, icc.invoice_id, inv.gig_id
      FROM invoice_card_charges icc
      JOIN invoices inv ON inv.id = icc.invoice_id
      WHERE icc.expense_id = $1
      LIMIT 1;
    `,
    values: [expenseId],
  });
  return rows[0] ?? null;
}
