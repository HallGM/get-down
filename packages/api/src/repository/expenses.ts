import { run_query } from "../db/init.js";

export interface ExpenseRow {
  id: number;
  date: string | null;
  amount: number;
  description: string;
  category: string | null;
  recipient_name: string | null;
  payment_method: string | null;
  airtable_id: string | null;
}

export interface ExpenseMutationInput {
  date?: string;
  amount: number;
  description: string;
  category?: string;
  recipientName?: string;
  paymentMethod?: string;
  airtableId?: string;
}

const SELECT_COLS = `id, date, amount, description, category, recipient_name, payment_method, airtable_id`;

export async function createExpense(input: ExpenseMutationInput): Promise<ExpenseRow> {
  const rows = await run_query<ExpenseRow>({
    text: `
      INSERT INTO expenses (date, amount, description, category, recipient_name, payment_method, airtable_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.date ?? null,
      input.amount,
      input.description,
      input.category ?? null,
      input.recipientName ?? null,
      input.paymentMethod ?? null,
      input.airtableId ?? null,
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
          recipient_name = $5, payment_method = $6, airtable_id = $7
      WHERE id = $8
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.date ?? null,
      input.amount,
      input.description,
      input.category ?? null,
      input.recipientName ?? null,
      input.paymentMethod ?? null,
      input.airtableId ?? null,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function deleteExpense(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM expenses WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
