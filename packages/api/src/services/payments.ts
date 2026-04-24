import type { Payment, CreatePaymentRequest, UpdatePaymentRequest } from "@get-down/shared";
import * as paymentsRepo from "../repository/payments.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getAllPayments(): Promise<Payment[]> {
  const rows = await paymentsRepo.readAllPayments();
  return rows.map(mapPayment);
}

export async function getPaymentsByGig(gigId: number): Promise<Payment[]> {
  const rows = await paymentsRepo.readPaymentsByGigId(gigId);
  return rows.map(mapPayment);
}

export async function getPaymentById(id: number): Promise<Payment> {
  const row = await paymentsRepo.readPaymentById(id);
  if (!row) throw new NotFoundError("Payment not found");
  return mapPayment(row);
}

export async function createPayment(input: CreatePaymentRequest): Promise<Payment> {
  const row = await paymentsRepo.createPayment(buildMutationInput(input));
  return mapPayment(row);
}

export async function updatePayment(id: number, input: UpdatePaymentRequest): Promise<Payment> {
  const existing = await getPaymentById(id);
  const row = await paymentsRepo.updatePayment(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("Payment not found");
  return mapPayment(row);
}

export async function deletePayment(id: number): Promise<void> {
  const deleted = await paymentsRepo.deletePayment(id);
  if (!deleted) throw new NotFoundError("Payment not found");
}

function toDateString(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function mapPayment(row: paymentsRepo.PaymentRow): Payment {
  return {
    id: row.id,
    gigId: row.gig_id,
    date: toDateString(row.date) ?? undefined,
    amount: row.amount,
    method: row.method ?? undefined,
    description: row.description ?? undefined,
    airtableId: row.airtable_id ?? undefined,
    invoiceId: row.invoice_id ?? undefined,
  };
}

function buildMutationInput(
  input: CreatePaymentRequest | UpdatePaymentRequest,
  existing?: Payment
): paymentsRepo.PaymentMutationInput {
  const gigId = input.gigId ?? existing?.gigId;
  if (!gigId) throw new BadRequestError("gigId is required");
  const amount = input.amount ?? existing?.amount;
  if (amount === undefined) throw new BadRequestError("amount is required");

  return {
    gigId,
    date: input.date ?? existing?.date,
    amount,
    method: input.method?.trim() ?? existing?.method,
    description: input.description?.trim() ?? existing?.description,
    airtableId: input.airtableId ?? existing?.airtableId,
  };
}
