import { run_query } from "../db/init.js";
import { SQL_PERSON_NAME_EXPR } from "./sql-fragments.js";

export interface ExpensePaymentRow {
  id: number;
  account_id: number;
  amount: number;
  date: string | null;
  payment_method: string | null;
  description: string | null;
}

export interface ExpensePaymentShareRow {
  payment_id: number;
  expense_id: number;
  expense_description: string;
  amount: number;
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

const SELECT_COLS = `id, account_id, amount, date::text AS date, payment_method, description`;

export async function createExpensePayment(input: ExpensePaymentMutationInput): Promise<ExpensePaymentRow> {
  const rows = await run_query<ExpensePaymentRow>({
    text: `INSERT INTO expense_payments (account_id, amount, date, payment_method, description)
      VALUES ($1, $2, $3, $4, $5) RETURNING ${SELECT_COLS};`,
    values: [input.accountId, input.amount, input.date ?? null, input.paymentMethod ?? null, input.description ?? null],
  });
  return rows[0];
}

export async function createPaymentShare(paymentId: number, expenseId: number, amount: number): Promise<void> {
  await run_query({
    text: `INSERT INTO expense_payment_shares (payment_id, expense_id, amount) VALUES ($1, $2, $3);`,
    values: [paymentId, expenseId, amount],
  });
}

export async function replacePaymentShares(paymentId: number, shares: Array<{ expenseId: number; amount: number }>): Promise<void> {
  await run_query({ text: `DELETE FROM expense_payment_shares WHERE payment_id = $1;`, values: [paymentId] });
  for (const share of shares) await createPaymentShare(paymentId, share.expenseId, share.amount);
}

export async function readPaymentShares(paymentIds: number[]): Promise<ExpensePaymentShareRow[]> {
  if (paymentIds.length === 0) return [];
  return run_query<ExpensePaymentShareRow>({
    text: `SELECT s.payment_id, s.expense_id, e.description AS expense_description, s.amount
      FROM expense_payment_shares s JOIN expenses e ON e.id = s.expense_id
      WHERE s.payment_id = ANY($1::int[]) ORDER BY e.description, s.expense_id;`,
    values: [paymentIds],
  });
}

export async function readEligibleExpensesByIds(expenseIds: number[]): Promise<Array<{ id: number; description: string; is_tax_only: boolean }>> {
  if (expenseIds.length === 0) return [];
  return run_query({
    text: `SELECT id, description, is_tax_only FROM expenses WHERE id = ANY($1::int[]);`,
    values: [expenseIds],
  });
}

export async function readEligibleExpenses(): Promise<Array<{ id: number; description: string; amount: number }>> {
  return run_query({
    text: `SELECT id, description, amount FROM expenses WHERE is_tax_only = false ORDER BY date DESC NULLS LAST, id DESC;`,
  });
}

export async function readPaymentsByExpenseId(expenseId: number): Promise<ExpensePaymentRow[]> {
  return run_query<ExpensePaymentRow>({
    text: `SELECT ep.id, ep.account_id, ep.amount, ep.date::text AS date, ep.payment_method, ep.description
      FROM expense_payments ep JOIN expense_payment_shares s ON s.payment_id = ep.id
      WHERE s.expense_id = $1 ORDER BY ep.date ASC NULLS LAST, ep.id ASC;`,
    values: [expenseId],
  });
}

export async function readPaymentStatusByExpenseIds(expenseIds: number[]): Promise<Map<number, PaymentStatusRow>> {
  if (expenseIds.length === 0) return new Map();
  const rows = await run_query<PaymentStatusRow>({
    text: `SELECT expense_id, SUM(amount)::int AS total_paid, COUNT(*)::int AS payment_count
      FROM expense_payment_shares WHERE expense_id = ANY($1::int[]) GROUP BY expense_id;`,
    values: [expenseIds],
  });
  return new Map(rows.map((row) => [row.expense_id, row]));
}

export async function readPaymentById(id: number): Promise<ExpensePaymentRow | null> {
  const rows = await run_query<ExpensePaymentRow>({ text: `SELECT ${SELECT_COLS} FROM expense_payments WHERE id = $1;`, values: [id] });
  return rows[0] ?? null;
}

export async function updateExpensePayment(id: number, input: ExpensePaymentMutationInput): Promise<ExpensePaymentRow | null> {
  const rows = await run_query<ExpensePaymentRow>({
    text: `UPDATE expense_payments SET account_id = $1, amount = $2, date = $3, payment_method = $4, description = $5
      WHERE id = $6 RETURNING ${SELECT_COLS};`,
    values: [input.accountId, input.amount, input.date ?? null, input.paymentMethod ?? null, input.description ?? null, id],
  });
  return rows[0] ?? null;
}

export interface ExpensePaymentSummaryRow extends ExpensePaymentRow {
  paid_for_by: string;
  assigned_total: number;
}

export async function readAllPaymentSummaries(): Promise<ExpensePaymentSummaryRow[]> {
  return run_query<ExpensePaymentSummaryRow>({
    text: `SELECT ep.id, ep.account_id, ep.amount, ep.date::text AS date, ep.payment_method, ep.description,
      CASE WHEN a.is_business THEN 'Business' ELSE ${SQL_PERSON_NAME_EXPR} END AS paid_for_by,
      COALESCE(SUM(s.amount), 0)::int AS assigned_total
      FROM expense_payments ep JOIN accounts a ON a.id = ep.account_id
      LEFT JOIN people p ON p.id = a.person_id LEFT JOIN expense_payment_shares s ON s.payment_id = ep.id
      GROUP BY ep.id, a.id, p.display_name, p.first_name, p.last_name
      ORDER BY ep.date DESC NULLS LAST, ep.id DESC;`,
  });
}

export async function deleteExpensePayment(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({ text: `DELETE FROM expense_payments WHERE id = $1 RETURNING id;`, values: [id] });
  return rows.length > 0;
}
