import { z } from "zod";
import type { ExpensePayment, ExpensePaymentSummary } from "@get-down/shared";
import * as repo from "../repository/expense_payments.js";
import * as expensesRepo from "../repository/expenses.js";
import * as accountsRepo from "../repository/accounts.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";

export const BasePaymentSchema = z.object({
  accountId: z.number().int().positive("accountId must be a positive integer"),
  amount:    z.number().int("amount must be an integer number of pennies"),
  date:      z.string().optional(),
});

export const CreatePaymentSchema = BasePaymentSchema.extend({
  paymentMethod: z.string().optional(),
  description:   z.string().optional(),
});

const UpdatePaymentSchema = CreatePaymentSchema.partial().extend({
  accountId: z.number().int().positive().optional(),
  amount: z.number().int().optional(),
});

export async function getAllPaymentSummaries(): Promise<ExpensePaymentSummary[]> {
  const rows = await repo.readAllPaymentSummaries();
  return rows.map((row) => ({
    id: row.id,
    expenseId: row.expense_id,
    expenseDescription: row.expense_description,
    date: row.date ?? undefined,
    amount: row.amount,
    paidForBy: row.paid_for_by,
  }));
}

export async function getPaymentsByExpense(expenseId: number): Promise<ExpensePayment[]> {
  const expense = await expensesRepo.readExpenseById(expenseId);
  if (!expense) throw new NotFoundError("Expense not found");
  const rows = await repo.readPaymentsByExpenseId(expenseId);
  return rows.map(mapPayment);
}

export async function createPayment(expenseId: number, body: unknown): Promise<ExpensePayment> {
  const expense = await expensesRepo.readExpenseById(expenseId);
  if (!expense) throw new NotFoundError("Expense not found");

  const input = parseOrBadRequest(CreatePaymentSchema, body);
  if (input.amount === 0) throw new BadRequestError("amount must not be zero");

  const account = await accountsRepo.readAccountById(input.accountId);
  if (!account) throw new BadRequestError("accountId references an account that does not exist");

  const row = await repo.createExpensePayment(expenseId, input);
  return mapPayment(row);
}

export async function updatePayment(
  expenseId: number,
  paymentId: number,
  body: unknown
): Promise<ExpensePayment> {
  const existing = await repo.readPaymentById(paymentId);
  if (!existing || existing.expense_id !== expenseId) throw new NotFoundError("Payment not found");

  const input = parseOrBadRequest(UpdatePaymentSchema, body);
  if (input.amount !== undefined && input.amount === 0) {
    throw new BadRequestError("amount must not be zero");
  }

  const merged = {
    accountId: input.accountId ?? existing.account_id,
    amount: input.amount ?? existing.amount,
    date: input.date ?? (existing.date ?? undefined),
    paymentMethod: input.paymentMethod ?? (existing.payment_method ?? undefined),
    description: input.description ?? (existing.description ?? undefined),
  };

  if (input.accountId !== undefined) {
    const account = await accountsRepo.readAccountById(merged.accountId);
    if (!account) throw new BadRequestError("accountId references an account that does not exist");
  }

  const row = await repo.updateExpensePayment(paymentId, merged);
  if (!row) throw new NotFoundError("Payment not found");
  return mapPayment(row);
}

export async function deletePayment(expenseId: number, paymentId: number): Promise<void> {
  const existing = await repo.readPaymentById(paymentId);
  if (!existing || existing.expense_id !== expenseId) throw new NotFoundError("Payment not found");
  await repo.deleteExpensePayment(paymentId);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

export function mapPayment(row: repo.ExpensePaymentRow): ExpensePayment {
  return {
    id: row.id,
    expenseId: row.expense_id,
    accountId: row.account_id,
    amount: row.amount,
    date: row.date ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    description: row.description ?? undefined,
  };
}
