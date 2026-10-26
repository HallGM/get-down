import { z } from "zod";
import type { ExpensePayment, ExpensePaymentSummary } from "@get-down/shared";
import * as repo from "../repository/expense_payments.js";
import * as expensesRepo from "../repository/expenses.js";
import * as accountsRepo from "../repository/accounts.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";
import { calculateExpensePaymentMismatch } from "../utils/expensePayment.js";
import { withTransaction } from "../db/init.js";

const ShareSchema = z.object({ expenseId: z.number().int().positive(), amount: z.number().int() });
export const BasePaymentSchema = z.object({
  accountId: z.number().int().positive("accountId must be a positive integer"),
  amount: z.number().int("amount must be an integer number of pennies"),
  date: z.string().optional(),
});
export const CreatePaymentSchema = BasePaymentSchema.extend({
  paymentMethod: z.string().optional(),
  description: z.string().optional(),
  shares: z.array(ShareSchema).optional(),
});
const UpdatePaymentSchema = CreatePaymentSchema.omit({ shares: true }).partial().extend({
  accountId: z.number().int().positive().optional(),
  amount: z.number().int().optional(),
});

export async function getEligibleExpenses() {
  return (await repo.readEligibleExpenses()).map((row) => ({
    id: row.id,
    date: row.date ?? undefined,
    recipientName: row.recipient_name ?? undefined,
    description: row.description,
    amount: row.amount,
  }));
}

export async function getAllPaymentSummaries(): Promise<ExpensePaymentSummary[]> {
  const rows = await repo.readAllPaymentSummaries();
  const shares = await repo.readPaymentShares(rows.map((row) => row.id));
  const grouped = groupShares(shares);
  return rows.map((row) => ({
    id: row.id, accountId: row.account_id, paymentMethod: row.payment_method ?? undefined,
    description: row.description ?? undefined, date: row.date ?? undefined, amount: row.amount, paidForBy: row.paid_for_by,
    assignedTotal: row.assigned_total, mismatch: calculateExpensePaymentMismatch(row.amount, row.assigned_total),
    shares: grouped.get(row.id) ?? [],
  }));
}

export async function getPaymentsByExpense(expenseId: number): Promise<ExpensePayment[]> {
  const expense = await expensesRepo.readExpenseById(expenseId);
  if (!expense) throw new NotFoundError("Expense not found");
  const rows = await repo.readPaymentsByExpenseId(expenseId);
  const grouped = groupShares(await repo.readPaymentShares(rows.map((row) => row.id)));
  return rows.map((row) => mapPayment(row, grouped.get(row.id) ?? []));
}

export async function getPaymentById(paymentId: number): Promise<ExpensePayment> {
  const row = await repo.readPaymentById(paymentId);
  if (!row) throw new NotFoundError("Payment not found");
  return mapPayment(row, await getSharesForPayment(paymentId));
}

export async function getPaymentShares(paymentId: number): Promise<ExpensePayment["shares"]> {
  if (!(await repo.readPaymentById(paymentId))) throw new NotFoundError("Payment not found");
  return getSharesForPayment(paymentId);
}

export async function createPayment(body: unknown, defaultExpenseId?: number): Promise<ExpensePayment> {
  const input = parseOrBadRequest(CreatePaymentSchema, body);
  if (input.amount === 0) throw new BadRequestError("amount must not be zero");
  const account = await accountsRepo.readAccountById(input.accountId);
  if (!account) throw new BadRequestError("accountId references an account that does not exist");
  const shares = input.shares ?? (defaultExpenseId === undefined ? [] : [{ expenseId: defaultExpenseId, amount: input.amount }]);
  await validatePaymentShares(shares);
  return withTransaction(async () => {
    const row = await repo.createExpensePayment(input);
    await repo.replacePaymentShares(row.id, shares);
    return mapPayment(row, await getSharesForPayment(row.id));
  });
}

export async function updatePayment(paymentId: number, body: unknown): Promise<ExpensePayment> {
  const existing = await repo.readPaymentById(paymentId);
  if (!existing) throw new NotFoundError("Payment not found");
  const input = parseOrBadRequest(UpdatePaymentSchema, body);
  if (input.amount === 0) throw new BadRequestError("amount must not be zero");
  const merged = {
    accountId: input.accountId ?? existing.account_id,
    amount: input.amount ?? existing.amount,
    date: input.date ?? existing.date ?? undefined,
    paymentMethod: input.paymentMethod ?? existing.payment_method ?? undefined,
    description: input.description ?? existing.description ?? undefined,
  };
  if (input.accountId !== undefined && !(await accountsRepo.readAccountById(merged.accountId))) {
    throw new BadRequestError("accountId references an account that does not exist");
  }
  const row = await repo.updateExpensePayment(paymentId, merged);
  if (!row) throw new NotFoundError("Payment not found");
  return mapPayment(row, await getSharesForPayment(paymentId));
}

export async function updatePaymentShares(paymentId: number, body: unknown): Promise<ExpensePayment> {
  const existing = await repo.readPaymentById(paymentId);
  if (!existing) throw new NotFoundError("Payment not found");
  const { shares } = parseOrBadRequest(z.object({ shares: z.array(ShareSchema) }), body);
  await validatePaymentShares(shares);
  return withTransaction(async () => {
    await repo.replacePaymentShares(paymentId, shares);
    return mapPayment(existing, await getSharesForPayment(paymentId));
  });
}

export async function deletePaymentShare(paymentId: number, expenseId: number): Promise<void> {
  const payment = await repo.readPaymentById(paymentId);
  if (!payment) throw new NotFoundError("Payment not found");
  const shares = (await getSharesForPayment(paymentId)).filter((share) => share.expenseId !== expenseId);
  await withTransaction(() => repo.replacePaymentShares(
    paymentId,
    shares.map(({ expenseId: id, amount }) => ({ expenseId: id, amount })),
  ));
}

export async function deletePayment(paymentId: number): Promise<void> {
  if (!(await repo.deleteExpensePayment(paymentId))) throw new NotFoundError("Payment not found");
}

export function mapPayment(row: repo.ExpensePaymentRow, shares: ExpensePayment["shares"] = []): ExpensePayment {
  return {
    id: row.id, accountId: row.account_id, amount: row.amount,
    date: row.date ?? undefined, paymentMethod: row.payment_method ?? undefined,
    description: row.description ?? undefined, shares,
  };
}

export async function validatePaymentShares(shares: Array<{ expenseId: number; amount: number }>): Promise<void> {
  const ids = shares.map((share) => share.expenseId);
  const expenses = await repo.readEligibleExpensesByIds(ids);
  assertShareTargets(shares, expenses);
}

export function assertShareTargets(
  shares: Array<{ expenseId: number; amount: number }>,
  expenses: Array<{ id: number; description: string; is_tax_only: boolean }>,
): void {
  const ids = shares.map((share) => share.expenseId);
  if (new Set(ids).size !== ids.length) throw new BadRequestError("Each expense may only appear once in a payment");
  if (expenses.length !== ids.length) throw new BadRequestError("One or more expenses do not exist");
  if (expenses.some((expense) => expense.is_tax_only)) throw new BadRequestError("Tax-only expenses cannot receive payment shares");
}

async function getSharesForPayment(paymentId: number): Promise<ExpensePayment["shares"]> {
  return (await repo.readPaymentShares([paymentId])).map(mapExpensePaymentShare);
}

function groupShares(rows: repo.ExpensePaymentShareRow[]): Map<number, ExpensePayment["shares"]> {
  const grouped = new Map<number, ExpensePayment["shares"]>();
  for (const row of rows) {
    const list = grouped.get(row.payment_id) ?? [];
    list.push(mapExpensePaymentShare(row));
    grouped.set(row.payment_id, list);
  }
  return grouped;
}

export function mapExpensePaymentShare(row: repo.ExpensePaymentShareRow): ExpensePayment["shares"][number] {
  return {
    expenseId: row.expense_id,
    expenseDescription: row.expense_description,
    expenseDate: row.expense_date ?? undefined,
    expenseRecipientName: row.expense_recipient_name ?? undefined,
    expenseAmount: row.expense_amount,
    amount: row.amount,
  };
}
