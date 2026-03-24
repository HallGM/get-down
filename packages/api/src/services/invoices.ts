import type {
  Invoice,
  InvoiceLineItem,
  InvoiceAdditionalCharge,
  InvoicePaymentMade,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreateInvoiceLineItemRequest,
} from "@get-down/shared";
import * as invoicesRepo from "../repository/invoices.js";
import * as gigsRepo from "../repository/gigs.js";
import * as gigLineItemsRepo from "../repository/gig_line_items.js";
import * as paymentsRepo from "../repository/payments.js";
import { withTransaction } from "../db/init.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getInvoicesByGig(gigId: number): Promise<Invoice[]> {
  const rows = await invoicesRepo.readInvoicesByGigId(gigId);
  return rows.map(mapInvoice);
}

export async function getInvoiceById(id: number): Promise<Invoice> {
  const row = await invoicesRepo.readInvoiceById(id);
  if (!row) throw new NotFoundError("Invoice not found");
  return withSubresources(mapInvoice(row));
}

export async function createInvoice(input: CreateInvoiceRequest): Promise<Invoice> {
  const { gigId } = input;
  if (!gigId) throw new BadRequestError("gigId is required");

  const [gig, lineItems, payments] = await Promise.all([
    gigsRepo.readGigById(gigId),
    gigLineItemsRepo.readGigLineItemsByGigId(gigId),
    paymentsRepo.readPaymentsByGigId(gigId),
  ]);

  if (!gig) throw new NotFoundError("Gig not found");

  const subtotal = lineItems.reduce((sum, li) => sum + (li.amount ?? 0), 0);
  const discountAmount = Math.round(subtotal * gig.discount_percent / 100);
  const total = subtotal - discountAmount + gig.travel_cost;
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const amountDue = Math.max(0, total - paid);

  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(2, 4);

  return withTransaction(async () => {
    const seq = await invoicesRepo.nextInvoiceSequence(year);
    const invoiceNumber = `${year}-${String(seq).padStart(4, "0")}`;

    const row = await invoicesRepo.createInvoice({
      gigId,
      invoiceNumber,
      customerName: `${gig.first_name} ${gig.last_name}`,
      eventDate: toDateString(gig.date) ?? undefined,
      venue: gig.venue_name ?? undefined,
      date: today,
      subtotalAmount: subtotal,
      discountPercent: gig.discount_percent,
      travelCost: gig.travel_cost,
      totalAmount: total,
      amountDue,
    });

    const [snappedLineItems, snappedPayments] = await Promise.all([
      Promise.all(
        lineItems.map((li) =>
          invoicesRepo.createLineItem(row.id, li.description, li.amount)
        )
      ),
      Promise.all(
        payments.map((p) =>
          invoicesRepo.createPaymentMade(row.id, p.description, p.date, p.amount)
        )
      ),
    ]);

    return {
      ...mapInvoice(row),
      lineItems: snappedLineItems.map(mapLineItem),
      additionalCharges: [],
      paymentsMade: snappedPayments.map(mapPaymentMade),
    };
  });
}

export async function updateInvoice(id: number, input: UpdateInvoiceRequest): Promise<Invoice> {
  const existing = await getInvoiceById(id);
  const row = await invoicesRepo.updateInvoice(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("Invoice not found");
  return withSubresources(mapInvoice(row));
}

export async function deleteInvoice(id: number): Promise<void> {
  const deleted = await invoicesRepo.deleteInvoice(id);
  if (!deleted) throw new NotFoundError("Invoice not found");
}

export async function addLineItem(
  invoiceId: number,
  input: CreateInvoiceLineItemRequest
): Promise<InvoiceLineItem> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");
  const row = await invoicesRepo.createLineItem(
    invoiceId,
    input.description?.trim() ?? null,
    input.amount ?? null
  );
  return mapLineItem(row);
}

export async function removeLineItem(invoiceId: number, lineItemId: number): Promise<void> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");
  const deleted = await invoicesRepo.deleteLineItem(lineItemId);
  if (!deleted) throw new NotFoundError("LineItem not found");
}

export async function addAdditionalCharge(
  invoiceId: number,
  input: CreateInvoiceLineItemRequest
): Promise<InvoiceAdditionalCharge> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");
  const row = await invoicesRepo.createAdditionalCharge(
    invoiceId,
    input.description?.trim() ?? null,
    input.amount ?? null
  );
  return mapAdditionalCharge(row);
}

export async function removeAdditionalCharge(invoiceId: number, chargeId: number): Promise<void> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");
  const deleted = await invoicesRepo.deleteAdditionalCharge(chargeId);
  if (!deleted) throw new NotFoundError("AdditionalCharge not found");
}

export async function addPaymentMade(
  invoiceId: number,
  input: { description?: string; date?: string; amount?: number }
): Promise<InvoicePaymentMade> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");
  const row = await invoicesRepo.createPaymentMade(
    invoiceId,
    input.description?.trim() ?? null,
    input.date ?? null,
    input.amount ?? null
  );
  return mapPaymentMade(row);
}

export async function removePaymentMade(invoiceId: number, paymentMadeId: number): Promise<void> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");
  const deleted = await invoicesRepo.deletePaymentMade(paymentMadeId);
  if (!deleted) throw new NotFoundError("PaymentMade not found");
}

/**
 * Build the Flask payload from live gig account data (no DB write).
 * Used for the invoice preview endpoint.
 */
export async function buildPreviewPayloadForGig(gigId: number): Promise<Record<string, unknown>> {
  const [gig, lineItems, payments] = await Promise.all([
    gigsRepo.readGigById(gigId),
    gigLineItemsRepo.readGigLineItemsByGigId(gigId),
    paymentsRepo.readPaymentsByGigId(gigId),
  ]);

  if (!gig) throw new NotFoundError("Gig not found");

  const year = new Date().toISOString().slice(2, 4);
  const seq = await invoicesRepo.peekNextInvoiceSequence(year);
  const invoiceNumber = `${year}-${String(seq).padStart(4, "0")} (PREVIEW)`;

  return {
    invoice_number: invoiceNumber,
    customer_name: `${gig.first_name} ${gig.last_name}`,
    event_date: toDateString(gig.date) ?? "",
    venue: gig.venue_name ?? "",
    custom_items: lineItems.map((li) => ({
      description: li.description ?? "",
      price: (li.amount ?? 0) / 100,
    })),
    additional_charges: [],
    payment_made: payments.map((p) => ({
      description: p.description ?? "",
      price: p.amount / 100,
    })),
    ...(gig.discount_percent > 0 && { discount_percent: gig.discount_percent }),
    ...(gig.travel_cost > 0 && { travel_cost: gig.travel_cost / 100 }),
  };
}

/**
 * Build the payload expected by the Python Flask invoice service.
 * DB amounts are stored as integer pennies; Flask expects floats in pounds.
 */
export async function buildInvoicePayload(id: number): Promise<Record<string, unknown>> {
  const invoice = await getInvoiceById(id);

  return {
    invoice_number: invoice.invoiceNumber,
    customer_name: invoice.customerName,
    event_date: invoice.eventDate ?? "",
    venue: invoice.venue ?? "",
    custom_items:
      invoice.lineItems?.map((li) => ({
        description: li.description ?? "",
        price: (li.amount ?? 0) / 100,
      })) ?? [],
    additional_charges:
      invoice.additionalCharges?.map((ac) => ({
        description: ac.description ?? "",
        price: (ac.amount ?? 0) / 100,
      })) ?? [],
    payment_made:
      invoice.paymentsMade?.map((pm) => ({
        description: pm.description ?? "",
        price: (pm.amount ?? 0) / 100,
      })) ?? [],
    discount_percent: invoice.discountPercent > 0 ? invoice.discountPercent : undefined,
    travel_cost: invoice.travelCost > 0 ? invoice.travelCost / 100 : undefined,
  };
}

function toDateString(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function mapInvoice(row: invoicesRepo.InvoiceRow): Invoice {
  return {
    id: row.id,
    gigId: row.gig_id,
    invoiceNumber: row.invoice_number,
    customerName: row.customer_name,
    eventDate: toDateString(row.event_date) ?? undefined,
    venue: row.venue ?? undefined,
    date: toDateString(row.date) ?? row.date,
    subtotalAmount: row.subtotal_amount,
    discountPercent: row.discount_percent,
    travelCost: row.travel_cost,
    totalAmount: row.total_amount,
    amountDue: row.amount_due,
  };
}

function mapLineItem(row: invoicesRepo.InvoiceLineItemRow): InvoiceLineItem {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description ?? undefined,
    amount: row.amount ?? undefined,
  };
}

function mapAdditionalCharge(row: invoicesRepo.InvoiceAdditionalChargeRow): InvoiceAdditionalCharge {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description ?? undefined,
    amount: row.amount ?? undefined,
  };
}

function mapPaymentMade(row: invoicesRepo.InvoicePaymentMadeRow): InvoicePaymentMade {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description ?? undefined,
    date: toDateString(row.date) ?? undefined,
    amount: row.amount ?? undefined,
  };
}

async function withSubresources(invoice: Invoice): Promise<Invoice> {
  const [lineItems, additionalCharges, paymentsMade] = await Promise.all([
    invoicesRepo.readLineItemsByInvoiceId(invoice.id),
    invoicesRepo.readAdditionalChargesByInvoiceId(invoice.id),
    invoicesRepo.readPaymentsMadeByInvoiceId(invoice.id),
  ]);
  return {
    ...invoice,
    lineItems: lineItems.map(mapLineItem),
    additionalCharges: additionalCharges.map(mapAdditionalCharge),
    paymentsMade: paymentsMade.map(mapPaymentMade),
  };
}

function buildMutationInput(
  input: UpdateInvoiceRequest,
  existing?: Invoice
): invoicesRepo.InvoiceMutationInput {
  const gigId = existing?.gigId;
  if (!gigId) throw new BadRequestError("gigId is required");
  const invoiceNumber = input.invoiceNumber?.trim() ?? existing?.invoiceNumber;
  if (!invoiceNumber) throw new BadRequestError("invoiceNumber is required");
  const customerName = input.customerName?.trim() ?? existing?.customerName;
  if (!customerName) throw new BadRequestError("customerName is required");
  const date = input.date ?? existing?.date;
  if (!date) throw new BadRequestError("date is required");

  return {
    gigId,
    invoiceNumber,
    customerName,
    eventDate: input.eventDate ?? existing?.eventDate,
    venue: input.venue?.trim() ?? existing?.venue,
    date,
    subtotalAmount: input.subtotalAmount ?? existing?.subtotalAmount ?? 0,
    discountPercent: input.discountPercent ?? existing?.discountPercent ?? 0,
    travelCost: input.travelCost ?? existing?.travelCost ?? 0,
    totalAmount: input.totalAmount ?? existing?.totalAmount ?? 0,
    amountDue: input.amountDue ?? existing?.amountDue ?? 0,
  };
}
