import { z } from "zod";
import type { Refund, CreateRefundRequest, UpdateRefundRequest } from "@get-down/shared";
import * as refundsRepo from "../repository/refunds.js";
import * as gigsRepo from "../repository/gigs.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";

const CreateRefundSchema = z.object({
  gigId:       z.number().int().positive(),
  amount:      z.number().int().positive("amount must be a positive integer (pence)"),
  date:        z.string().optional(),
  method:      z.string().optional(),
  description: z.string().optional(),
  subtype:     z.enum(["credit", "adjustment"]).default("adjustment"),
});

const UpdateRefundSchema = z.object({
  gigId:       z.number().int().positive().optional(),
  amount:      z.number().int().positive("amount must be a positive integer (pence)").optional(),
  date:        z.string().optional(),
  method:      z.string().optional(),
  description: z.string().optional(),
  subtype:     z.enum(["credit", "adjustment"]).optional(),
});

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
  const parsed = parseOrBadRequest(CreateRefundSchema, input);

  const gig = await gigsRepo.readGigById(parsed.gigId);
  if (!gig) throw new NotFoundError("Gig not found");

  const row = await refundsRepo.createRefund({
    gigId:       parsed.gigId,
    date:        parsed.date,
    amount:      parsed.amount,
    method:      parsed.method?.trim(),
    description: parsed.description?.trim(),
    subtype:     parsed.subtype,
  });

  return mapRefund(row);
}

export async function updateRefund(id: number, input: UpdateRefundRequest): Promise<Refund> {
  const existing = await getRefundById(id);
  const parsed = parseOrBadRequest(UpdateRefundSchema, input);

  const gigId = parsed.gigId ?? existing.gigId;
  if (parsed.gigId && parsed.gigId !== existing.gigId) {
    const gig = await gigsRepo.readGigById(parsed.gigId);
    if (!gig) throw new NotFoundError("Gig not found");
  }

  const amount = parsed.amount ?? existing.amount;

  const row = await refundsRepo.updateRefund(id, {
    gigId,
    date:        parsed.date ?? existing.date,
    amount,
    method:      (parsed.method?.trim() ?? existing.method),
    description: (parsed.description?.trim() ?? existing.description),
    subtype:     parsed.subtype ?? existing.subtype,
  });
  if (!row) throw new NotFoundError("Refund not found");

  return mapRefund(row);
}

export async function deleteRefund(id: number): Promise<void> {
  const deleted = await refundsRepo.deleteRefund(id);
  if (!deleted) throw new NotFoundError("Refund not found");
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function mapRefund(row: refundsRepo.RefundRow): Refund {
  return {
    id:          row.id,
    gigId:       row.gig_id,
    date:        row.date ?? undefined,
    amount:      row.amount,
    method:      row.method ?? undefined,
    description: row.description ?? undefined,
    subtype:     row.subtype as 'credit' | 'adjustment',
  };
}
