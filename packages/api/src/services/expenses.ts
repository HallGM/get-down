import { randomUUID } from "crypto";
import { extname } from "path";
import { z } from "zod";
import type { Expense, CreateExpenseRequest, UpdateExpenseRequest } from "@get-down/shared";
import * as expensesRepo from "../repository/expenses.js";
import * as feeAllocationsRepo from "../repository/fee_allocations.js";
import * as storage from "../utils/storage.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";


export async function getAllExpenses(): Promise<Expense[]> {
  const rows = await expensesRepo.readAllExpenses();
  const ids = rows.map((r) => r.id);
  const allocationMap = await expensesRepo.readAllocationIdsByExpenseIds(ids);
  return Promise.all(rows.map((row) => mapExpense(row, allocationMap.get(row.id) ?? [])));
}

export async function getExpenseById(id: number): Promise<Expense> {
  const row = await expensesRepo.readExpenseById(id);
  if (!row) throw new NotFoundError("Expense not found");
  const allocationIds = await expensesRepo.readAllocationIdsByExpenseId(id);
  return await mapExpense(row, allocationIds);
}

export async function createExpense(input: CreateExpenseRequest): Promise<Expense> {
  const row = await expensesRepo.createExpense(buildMutationInput(input));
  return await mapExpense(row, []);
}

export async function updateExpense(id: number, input: UpdateExpenseRequest): Promise<Expense> {
  const existing = await getExpenseById(id);
  const row = await expensesRepo.updateExpense(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("Expense not found");
  const allocationIds = await expensesRepo.readAllocationIdsByExpenseId(id);
  return await mapExpense(row, allocationIds);
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

// ─── Private helpers ──────────────────────────────────────────────────────────

async function tryDeleteFile(key: string): Promise<void> {
  try {
    await storage.deleteFile(key);
  } catch (err) {
    console.error(`[storage] Failed to delete R2 object "${key}":`, err);
  }
}

function toDateString(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

export async function mapExpense(row: expensesRepo.ExpenseRow, feeAllocationIds: number[]): Promise<Expense> {
  let documentUrl: string | undefined;
  if (row.document_key) {
    try {
      documentUrl = await storage.getPresignedUrl(row.document_key, 3600);
    } catch (err) {
      console.error(`[storage] Failed to generate presigned URL for "${row.document_key}":`, err);
    }
  }

  return {
    id: row.id,
    date: toDateString(row.date) ?? undefined,
    amount: row.amount,
    description: row.description,
    category: row.category ?? undefined,
    recipientName: row.recipient_name ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    airtableId: row.airtable_id ?? undefined,
    documentUrl,
    feeAllocationIds,
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
