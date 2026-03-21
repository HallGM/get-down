import type { Expense, CreateExpenseRequest, UpdateExpenseRequest } from "@get-down/shared";
import * as expensesRepo from "../repository/expenses.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getAllExpenses(): Promise<Expense[]> {
  const rows = await expensesRepo.readAllExpenses();
  return rows.map(mapExpense);
}

export async function getExpenseById(id: number): Promise<Expense> {
  const row = await expensesRepo.readExpenseById(id);
  if (!row) throw new NotFoundError("Expense not found");
  return mapExpense(row);
}

export async function createExpense(input: CreateExpenseRequest): Promise<Expense> {
  const row = await expensesRepo.createExpense(buildMutationInput(input));
  return mapExpense(row);
}

export async function updateExpense(id: number, input: UpdateExpenseRequest): Promise<Expense> {
  const existing = await getExpenseById(id);
  const row = await expensesRepo.updateExpense(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("Expense not found");
  return mapExpense(row);
}

export async function deleteExpense(id: number): Promise<void> {
  const deleted = await expensesRepo.deleteExpense(id);
  if (!deleted) throw new NotFoundError("Expense not found");
}

function toDateString(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function mapExpense(row: expensesRepo.ExpenseRow): Expense {
  return {
    id: row.id,
    date: toDateString(row.date) ?? undefined,
    amount: row.amount,
    description: row.description,
    category: row.category ?? undefined,
    recipientName: row.recipient_name ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    airtableId: row.airtable_id ?? undefined,
  };
}

function buildMutationInput(
  input: CreateExpenseRequest | UpdateExpenseRequest,
  existing?: Expense
): expensesRepo.ExpenseMutationInput {
  const amount = input.amount ?? existing?.amount;
  if (amount === undefined) throw new BadRequestError("amount is required");
  const description = input.description?.trim() ?? existing?.description;
  if (!description) throw new BadRequestError("description is required");

  return {
    date: input.date ?? existing?.date,
    amount,
    description,
    category: input.category?.trim() ?? existing?.category,
    recipientName: input.recipientName?.trim() ?? existing?.recipientName,
    paymentMethod: input.paymentMethod?.trim() ?? existing?.paymentMethod,
    airtableId: input.airtableId ?? existing?.airtableId,
  };
}
