import { run_query } from "../db/init.js";

export interface ExpensePaymentRow {
  id: number;
  expense_id: number;
  account_id: number;
  amount: number;
  date: string | null;
  payment_method: string | null;
  description: string | null;
}

export interface ExpensePaymentMutationInput {
  accountId: number;
  amount: number;
  date?: string;
  paymentMethod?: string;
  description?: string;
}

export interface PaymentStatusRow {
  expense_id: number;
  total_paid: number;
  payment_count: number;
}

const SELECT_COLS = `id, expense_id, account_id, amount, date, payment_method, description`;

export async function createExpensePayment(
  expenseId: number,
  input: ExpensePaymentMutationInput
): Promise<ExpensePaymentRow> {
  const rows = await run_query<ExpensePaymentRow>({
    text: `
      INSERT INTO expense_payments (expense_id, account_id, amount, date, payment_method, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      expenseId,
      input.accountId,
      input.amount,
      input.date ?? null,
      input.paymentMethod ?? null,
      input.description ?? null,
    ],
  });
  return rows[0];
}

export async function readPaymentsByExpenseId(expenseId: number): Promise<ExpensePaymentRow[]> {
  return run_query<ExpensePaymentRow>({
    text: `SELECT ${SELECT_COLS} FROM expense_payments WHERE expense_id = $1 ORDER BY date ASC NULLS LAST, id ASC;`,
    values: [expenseId],
  });
}

export async function readPaymentsByExpenseIds(
  expenseIds: number[]
): Promise<ExpensePaymentRow[]> {
  if (expenseIds.length === 0) return [];
  return run_query<ExpensePaymentRow>({
    text: `SELECT ${SELECT_COLS} FROM expense_payments WHERE expense_id = ANY($1::int[]) ORDER BY expense_id, date ASC NULLS LAST, id ASC;`,
    values: [expenseIds],
  });
}

export async function readPaymentStatusByExpenseIds(
  expenseIds: number[]
): Promise<Map<number, PaymentStatusRow>> {
  if (expenseIds.length === 0) return new Map();
  const rows = await run_query<PaymentStatusRow>({
    text: `
      SELECT
        expense_id,
        COALESCE(SUM(amount), 0)::int AS total_paid,
        COUNT(*)::int                 AS payment_count
      FROM expense_payments
      WHERE expense_id = ANY($1::int[])
      GROUP BY expense_id;
    `,
    values: [expenseIds],
  });
  const map = new Map<number, PaymentStatusRow>();
  for (const row of rows) {
    map.set(row.expense_id, row);
  }
  return map;
}

export async function readPaymentById(id: number): Promise<ExpensePaymentRow | null> {
  const rows = await run_query<ExpensePaymentRow>({
    text: `SELECT ${SELECT_COLS} FROM expense_payments WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateExpensePayment(
  id: number,
  input: ExpensePaymentMutationInput
): Promise<ExpensePaymentRow | null> {
  const rows = await run_query<ExpensePaymentRow>({
    text: `
      UPDATE expense_payments
      SET account_id = $1, amount = $2, date = $3, payment_method = $4, description = $5
      WHERE id = $6
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.accountId,
      input.amount,
      input.date ?? null,
      input.paymentMethod ?? null,
      input.description ?? null,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function deleteExpensePayment(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM expense_payments WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
