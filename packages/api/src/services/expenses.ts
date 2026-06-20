import { randomUUID } from "crypto";
import { extname } from "path";
import { z } from "zod";
import type { Expense, CreateExpenseRequest, UpdateExpenseRequest } from "@get-down/shared";
import * as expensesRepo from "../repository/expenses.js";
import * as expensePaymentsRepo from "../repository/expense_payments.js";
import { mapPayment as mapExpensePayment, CreatePaymentSchema } from "../services/expense_payments.js";
import * as feeAllocationsRepo from "../repository/fee_allocations.js";
import * as attributionFeesRepo from "../repository/attribution_fees.js";
import * as accountsRepo from "../repository/accounts.js";
import * as storage from "../utils/storage.js";
import { withTransaction } from "../db/init.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";


export async function getAllExpenses(): Promise<Expense[]> {
  const rows = await expensesRepo.readAllExpenses();
  const ids = rows.map((r) => r.id);
  const [allocationMap, attributionFeeMap, paymentStatusMap] = await Promise.all([
    expensesRepo.readAllocationIdsByExpenseIds(ids),
    expensesRepo.readAttributionFeeIdsByExpenseIds(ids),
    expensePaymentsRepo.readPaymentStatusByExpenseIds(ids),
  ]);
  return Promise.all(rows.map(async (row) => {
    const status = paymentStatusMap.get(row.id);
    const totalPaid = status?.total_paid ?? 0;
    const documentUrl = await tryGetPresignedUrl(row.document_key);
    return mapExpense(row, allocationMap.get(row.id) ?? [], attributionFeeMap.get(row.id) ?? [], totalPaid, documentUrl);
  }));
}

export async function getExpenseById(id: number): Promise<Expense> {
  const row = await expensesRepo.readExpenseById(id);
  if (!row) throw new NotFoundError("Expense not found");
  return assembleExpense(row);
}

export async function createExpense(input: CreateExpenseRequest): Promise<Expense> {
  const mutationInput = buildMutationInput(input);

  if (input.payment) {
    const paymentInput = parseOrBadRequest(CreatePaymentSchema, input.payment);
    if (paymentInput.amount === 0) throw new BadRequestError("payment amount must not be zero");
    const account = await accountsRepo.readAccountById(paymentInput.accountId);
    if (!account) throw new BadRequestError("payment accountId references an account that does not exist");

    return withTransaction(async () => {
      const row = await expensesRepo.createExpense(mutationInput);
      await expensePaymentsRepo.createExpensePayment(row.id, paymentInput);
      return mapExpense(row, [], [], paymentInput.amount);
    });
  }

  const row = await expensesRepo.createExpense(mutationInput);
  return mapExpense(row, [], [], 0);
}

export async function updateExpense(id: number, input: UpdateExpenseRequest): Promise<Expense> {
  const existing = await getExpenseById(id);
  const row = await expensesRepo.updateExpense(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("Expense not found");
  return assembleExpense(row);
}

export async function uploadExpenseDocument(
  id: number,
  buffer: Buffer,
  mimeType: string,
  originalFilename: string
): Promise<void> {
  const row = await expensesRepo.readExpenseById(id);
  if (!row) throw new NotFoundError("Expense not found");

  if (row.document_key) {
    await tryDeleteFile(row.document_key);
  }

  const ext = extname(originalFilename);
  const key = `expenses/${id}/${randomUUID()}${ext}`;

  await storage.uploadFile(key, buffer, mimeType);
  await expensesRepo.setExpenseDocumentKey(id, key);
}

export async function removeExpenseDocument(id: number): Promise<void> {
  const row = await expensesRepo.readExpenseById(id);
  if (!row) throw new NotFoundError("Expense not found");
  if (!row.document_key) throw new NotFoundError("No document attached to this expense");

  await tryDeleteFile(row.document_key);
  await expensesRepo.setExpenseDocumentKey(id, null);
}

export async function deleteExpense(id: number): Promise<void> {
  const row = await expensesRepo.readExpenseById(id);
  const deleted = await expensesRepo.deleteExpense(id);
  if (!deleted) throw new NotFoundError("Expense not found");

  if (row?.document_key) {
    await tryDeleteFile(row.document_key);
  }
}

// ─── Allocation link management ───────────────────────────────────────────────

const LinkAllocationSchema = z.object({
  allocationId: z.number().int(),
});

export async function linkAllocationToExpense(
  expenseId: number,
  body: unknown
): Promise<void> {
  const { allocationId } = parseOrBadRequest(LinkAllocationSchema, body);
  const [expense, allocation] = await Promise.all([
    expensesRepo.readExpenseById(expenseId),
    feeAllocationsRepo.readFeeAllocationById(allocationId),
  ]);
  if (!expense) throw new NotFoundError("Expense not found");
  if (!allocation) throw new NotFoundError("FeeAllocation not found");
  await feeAllocationsRepo.linkExpenseToAllocation(allocationId, expenseId);
}

export async function unlinkAllocationFromExpense(
  expenseId: number,
  allocationId: number
): Promise<void> {
  const expense = await expensesRepo.readExpenseById(expenseId);
  if (!expense) throw new NotFoundError("Expense not found");
  await feeAllocationsRepo.unlinkExpenseFromAllocation(allocationId, expenseId);
}

// ─── Attribution fee link management ─────────────────────────────────────────

const LinkAttributionFeeSchema = z.object({ feeId: z.number().int() });

export async function linkAttributionFeeToExpense(
  expenseId: number,
  body: unknown
): Promise<void> {
  const { feeId } = parseOrBadRequest(LinkAttributionFeeSchema, body);
  const [expense, fee] = await Promise.all([
    expensesRepo.readExpenseById(expenseId),
    attributionFeesRepo.readAttributionFeeById(feeId),
  ]);
  if (!expense) throw new NotFoundError("Expense not found");
  if (!fee) throw new NotFoundError("AttributionFee not found");
  await attributionFeesRepo.linkExpenseToFee(feeId, expenseId);
}

export async function unlinkAttributionFeeFromExpense(
  expenseId: number,
  feeId: number
): Promise<void> {
  const expense = await expensesRepo.readExpenseById(expenseId);
  if (!expense) throw new NotFoundError("Expense not found");
  await attributionFeesRepo.unlinkExpenseFromFee(feeId, expenseId);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function assembleExpense(row: expensesRepo.ExpenseRow): Promise<Expense> {
  const [allocationIds, attributionFeeIds, payments] = await Promise.all([
    expensesRepo.readAllocationIdsByExpenseId(row.id),
    expensesRepo.readAttributionFeeIdsByExpenseId(row.id),
    expensePaymentsRepo.readPaymentsByExpenseId(row.id),
  ]);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const documentUrl = await tryGetPresignedUrl(row.document_key);
  const expense = mapExpense(row, allocationIds, attributionFeeIds, totalPaid, documentUrl);
  expense.payments = payments.map(mapExpensePayment);
  return expense;
}

async function tryDeleteFile(key: string): Promise<void> {
  try {
    await storage.deleteFile(key);
  } catch (err) {
    console.error(`[storage] Failed to delete R2 object "${key}":`, err);
  }
}

async function tryGetPresignedUrl(key: string | null): Promise<string | undefined> {
  if (!key) return undefined;
  try {
    return await storage.getPresignedUrl(key, 3600);
  } catch (err) {
    console.error(`[storage] Failed to generate presigned URL for "${key}":`, err);
    return undefined;
  }
}

function toDateString(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function computePaymentStatus(totalPaid: number, amount: number): 'unpaid' | 'partial' | 'paid' {
  if (totalPaid >= amount) return 'paid';
  if (totalPaid > 0) return 'partial';
  return 'unpaid';
}

export function mapExpense(
  row: expensesRepo.ExpenseRow,
  feeAllocationIds: number[],
  attributionFeeIds: number[],
  totalPaid: number,
  documentUrl?: string
): Expense {
  return {
    id: row.id,
    date: toDateString(row.date) ?? undefined,
    amount: row.amount,
    description: row.description,
    category: row.category ?? undefined,
    recipientName: row.recipient_name ?? undefined,
    airtableId: row.airtable_id ?? undefined,
    documentUrl,
    feeAllocationIds,
    attributionFeeIds,
    totalPaid,
    paymentStatus: computePaymentStatus(totalPaid, row.amount),
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
    airtableId: input.airtableId ?? existing?.airtableId,
  };
}

