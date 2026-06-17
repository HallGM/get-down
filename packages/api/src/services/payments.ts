import type { Payment, GigPaymentSummary, CreatePaymentRequest, UpdatePaymentRequest } from "@get-down/shared";
import * as paymentsRepo from "../repository/payments.js";
import * as accountsRepo from "../repository/accounts.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getAllPayments(): Promise<Payment[]> {
  const rows = await paymentsRepo.readAllPayments();
  return rows.map(mapPayment);
}

export async function getAllGigPaymentSummaries(): Promise<GigPaymentSummary[]> {
  const rows = await paymentsRepo.readAllGigPaymentSummaries();
  return rows.map(mapGigPaymentSummary);
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
  await validateReceivedByAccount(input.receivedByAccountId);
  const row = await paymentsRepo.createPayment(buildMutationInput(input));
  return mapPayment(row);
}

export async function updatePayment(id: number, input: UpdatePaymentRequest): Promise<Payment> {
  const existing = await getPaymentById(id);
  await validateReceivedByAccount(input.receivedByAccountId);
  const row = await paymentsRepo.updatePayment(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("Payment not found");
  return mapPayment(row);
}

export async function deletePayment(id: number): Promise<void> {
  const deleted = await paymentsRepo.deletePayment(id);
  if (!deleted) throw new NotFoundError("Payment not found");
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function validateReceivedByAccount(
  receivedByAccountId: number | null | undefined
): Promise<void> {
  if (receivedByAccountId == null) return;
  const account = await accountsRepo.readAccountById(receivedByAccountId);
  if (!account) throw new BadRequestError("receivedByAccountId references an account that does not exist");
  if (account.is_business) return;
  if (!account.is_partner) throw new BadRequestError("receivedByAccountId must be the business account or a partner account");
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
    receivedByAccountId: row.received_by_account_id ?? undefined,
  };
}

function mapGigPaymentSummary(row: paymentsRepo.GigPaymentSummaryRow): GigPaymentSummary {
  if (row.type !== 'payment' && row.type !== 'refund') {
    throw new Error(`Unexpected gig payment summary type: ${row.type}`);
  }
  return {
    id: row.id,
    type: row.type,
    gigId: row.gig_id,
    date: toDateString(row.date) ?? undefined,
    amount: row.amount,
    method: row.method ?? undefined,
    description: row.description ?? undefined,
    clientFirstName: row.client_first_name,
    clientLastName: row.client_last_name,
    gigDate: row.gig_date,
    receivedBy: row.received_by ?? undefined,
    receivedByAccountId: row.received_by_account_id ?? undefined,
    subtype: (row.subtype ?? undefined) as 'credit' | 'adjustment' | undefined,
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

  // Preserve undefined/null distinction: undefined means "not provided, keep existing".
  // null means "explicitly clear the field".
  const receivedByAccountId = 'receivedByAccountId' in input
    ? input.receivedByAccountId
    : (existing?.receivedByAccountId ?? null);

  return {
    gigId,
    date: input.date ?? existing?.date,
    amount,
    method: input.method?.trim() ?? existing?.method,
    description: input.description?.trim() ?? existing?.description,
    airtableId: input.airtableId ?? existing?.airtableId,
    receivedByAccountId: receivedByAccountId ?? null,
  };
}
