import type { Refund, CreateRefundRequest, UpdateRefundRequest } from "@get-down/shared";
import * as refundsRepo from "../repository/refunds.js";
import * as gigsRepo from "../repository/gigs.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getRefundsByGig(gigId: number): Promise<Refund[]> {
  const rows = await refundsRepo.readRefundsByGigId(gigId);
  return rows.map(mapRefund);
}

export async function getRefundById(id: number): Promise<Refund> {
  const row = await refundsRepo.readRefundById(id);
  if (!row) throw new NotFoundError("Refund not found");
  return mapRefund(row);
}

export async function createRefund(input: CreateRefundRequest): Promise<Refund> {
  const { gigId, amount } = input;
  if (!gigId) throw new BadRequestError("gigId is required");
  if (amount === undefined || amount === null) throw new BadRequestError("amount is required");
  if (!Number.isInteger(amount) || amount <= 0) throw new BadRequestError("amount must be a positive integer (pence)");

  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");

  const row = await refundsRepo.createRefund({
    gigId,
    date: input.date,
    amount,
    method: input.method?.trim(),
    description: input.description?.trim(),
  });

  return mapRefund(row);
}

export async function updateRefund(id: number, input: UpdateRefundRequest): Promise<Refund> {
  const existing = await getRefundById(id);

  const gigId = input.gigId ?? existing.gigId;
  if (input.gigId && input.gigId !== existing.gigId) {
    const gig = await gigsRepo.readGigById(input.gigId);
    if (!gig) throw new NotFoundError("Gig not found");
  }

  const amount = input.amount ?? existing.amount;
  if (!Number.isInteger(amount) || amount <= 0) throw new BadRequestError("amount must be a positive integer (pence)");

  const row = await refundsRepo.updateRefund(id, {
    gigId,
    date: input.date ?? existing.date,
    amount,
    method: (input.method?.trim() ?? existing.method),
    description: (input.description?.trim() ?? existing.description),
  });
  if (!row) throw new NotFoundError("Refund not found");

  return mapRefund(row);
}

export async function deleteRefund(id: number): Promise<void> {
  const deleted = await refundsRepo.deleteRefund(id);
  if (!deleted) throw new NotFoundError("Refund not found");
}

function mapRefund(row: refundsRepo.RefundRow): Refund {
  return {
    id: row.id,
    gigId: row.gig_id,
    date: row.date ?? undefined,
    amount: row.amount,
    method: row.method ?? undefined,
    description: row.description ?? undefined,
  };
}
