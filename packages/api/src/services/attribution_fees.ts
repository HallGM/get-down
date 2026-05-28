import { z } from "zod";
import type {
  AttributionFee,
  CreateAttributionFeeRequest,
  UpdateAttributionFeeRequest,
} from "@get-down/shared";
import * as attributionFeesRepo from "../repository/attribution_fees.js";
import * as attributionsRepo from "../repository/attributions.js";
import * as expensesRepo from "../repository/expenses.js";
import { NotFoundError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";

export async function getFeesByAttribution(attributionId: number): Promise<AttributionFee[]> {
  const attribution = await attributionsRepo.readAttributionById(attributionId);
  if (!attribution) throw new NotFoundError("Attribution not found");

  const rows = await attributionFeesRepo.readAttributionFeesByAttributionId(attributionId);
  const ids = rows.map((r) => r.id);
  const expenseMap = await attributionFeesRepo.readExpenseIdsByFeeIds(ids);
  return rows.map((row) => mapFee(row, expenseMap.get(row.id) ?? []));
}

export async function getAllAttributionFees(): Promise<AttributionFee[]> {
  const rows = await attributionFeesRepo.readAllAttributionFees();
  const ids = rows.map((r) => r.id);
  const expenseMap = await attributionFeesRepo.readExpenseIdsByFeeIds(ids);
  return rows.map((row) => mapFee(row, expenseMap.get(row.id) ?? []));
}

export async function getFeeById(id: number): Promise<AttributionFee> {
  const row = await attributionFeesRepo.readAttributionFeeById(id);
  if (!row) throw new NotFoundError("AttributionFee not found");
  const expenseIds = await attributionFeesRepo.readExpenseIdsByFeeId(id);
  return mapFee(row, expenseIds);
}

const CreateFeeSchema = z.object({
  description: z.string().optional(),
  date: z.string().optional(),
  amount: z.number().int().optional(),
});

export async function createFee(
  attributionId: number,
  body: unknown
): Promise<AttributionFee> {
  const attribution = await attributionsRepo.readAttributionById(attributionId);
  if (!attribution) throw new NotFoundError("Attribution not found");

  const input = parseOrBadRequest(CreateFeeSchema, body) as CreateAttributionFeeRequest;
  const row = await attributionFeesRepo.createAttributionFee({
    attributionId,
    description: input.description?.trim(),
    date: input.date,
    amount: input.amount,
  });
  return mapFee(row, []);
}

const UpdateFeeSchema = z.object({
  description: z.string().optional(),
  date: z.string().optional(),
  amount: z.number().int().optional(),
});

export async function updateFee(
  attributionId: number,
  feeId: number,
  body: unknown
): Promise<AttributionFee> {
  const existing = await attributionFeesRepo.readAttributionFeeById(feeId);
  if (!existing || existing.attribution_id !== attributionId) {
    throw new NotFoundError("AttributionFee not found");
  }

  const input = parseOrBadRequest(UpdateFeeSchema, body) as UpdateAttributionFeeRequest;
  const row = await attributionFeesRepo.updateAttributionFee(feeId, {
    description: input.description?.trim() ?? existing.description ?? undefined,
    date: input.date ?? existing.date ?? undefined,
    amount: input.amount ?? existing.amount ?? undefined,
  });
  if (!row) throw new NotFoundError("AttributionFee not found");

  const expenseIds = await attributionFeesRepo.readExpenseIdsByFeeId(feeId);
  return mapFee(row, expenseIds);
}

export async function deleteFee(attributionId: number, feeId: number): Promise<void> {
  const existing = await attributionFeesRepo.readAttributionFeeById(feeId);
  if (!existing || existing.attribution_id !== attributionId) {
    throw new NotFoundError("AttributionFee not found");
  }
  await attributionFeesRepo.deleteAttributionFee(feeId);
}

// ─── Expense link management ──────────────────────────────────────────────────

const LinkExpenseSchema = z.object({ expenseId: z.number().int() });

export async function linkExpenseToFee(
  attributionId: number,
  feeId: number,
  body: unknown
): Promise<void> {
  const existing = await attributionFeesRepo.readAttributionFeeById(feeId);
  if (!existing || existing.attribution_id !== attributionId) {
    throw new NotFoundError("AttributionFee not found");
  }
  const { expenseId } = parseOrBadRequest(LinkExpenseSchema, body);
  const expense = await expensesRepo.readExpenseById(expenseId);
  if (!expense) throw new NotFoundError("Expense not found");
  await attributionFeesRepo.linkExpenseToFee(feeId, expenseId);
}

export async function unlinkExpenseFromFee(
  attributionId: number,
  feeId: number,
  expenseId: number
): Promise<void> {
  const existing = await attributionFeesRepo.readAttributionFeeById(feeId);
  if (!existing || existing.attribution_id !== attributionId) {
    throw new NotFoundError("AttributionFee not found");
  }
  await attributionFeesRepo.unlinkExpenseFromFee(feeId, expenseId);
}

export async function getFeesByExpense(expenseId: number): Promise<AttributionFee[]> {
  const expense = await expensesRepo.readExpenseById(expenseId);
  if (!expense) throw new NotFoundError("Expense not found");

  const feeIds = await attributionFeesRepo.readFeeIdsByExpenseId(expenseId);
  if (feeIds.length === 0) return [];

  const rows = await Promise.all(feeIds.map((id) => attributionFeesRepo.readAttributionFeeById(id)));
  const validRows = rows.filter((r): r is NonNullable<typeof r> => r !== null);

  const expenseMap = await attributionFeesRepo.readExpenseIdsByFeeIds(feeIds);
  return validRows.map((row) => mapFee(row, expenseMap.get(row.id) ?? []));
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function toDateString(value: string | Date | null): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function mapFee(
  row: attributionFeesRepo.AttributionFeeRow,
  expenseIds: number[]
): AttributionFee {
  return {
    id: row.id,
    attributionId: row.attribution_id,
    description: row.description ?? undefined,
    date: toDateString(row.date),
    amount: row.amount ?? undefined,
    expenseIds,
  };
}
