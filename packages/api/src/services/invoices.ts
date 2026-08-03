import type {
  Invoice,
  InvoiceLineItem,
  InvoiceCardCharge,
  InvoicePaymentMade,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreateInvoiceLineItemRequest,
  UpdateInvoiceLineItemRequest,
  CreateInvoiceCardChargeRequest,
  UpdateInvoiceCardChargeRequest,
  UpdateInvoicePaymentMadeRequest,
} from "@get-down/shared";
import { z } from "zod";
import { effectiveLineItemsSubtotal, applyItemDiscount } from "@get-down/shared";
import * as invoicesRepo from "../repository/invoices.js";
import * as gigsRepo from "../repository/gigs.js";
import * as gigLineItemsRepo from "../repository/gig_line_items.js";
import * as paymentsRepo from "../repository/payments.js";
import * as refundsRepo from "../repository/refunds.js";
import * as expensesRepo from "../repository/expenses.js";
import * as storage from "../utils/storage.js";
import { withTransaction } from "../db/init.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../errors.js";
import { validateDiscountPercent } from "../utils/validation.js";
import { parseOrBadRequest } from "../utils/parse.js";
import { todayDate } from "../utils/date.js";
import { formatGigName } from "../utils/gig.js";
import { mapGigLineItem } from "./gigs.js";


export async function getAllInvoices(): Promise<Invoice[]> {
  const rows = await invoicesRepo.readAllInvoices();
  return rows.map(mapInvoice);
}

export async function getInvoicesByGig(gigId: number): Promise<Invoice[]> {
  const rows = await invoicesRepo.readInvoicesByGigId(gigId);
  return rows.map(mapInvoice);
}

export async function getInvoiceById(id: number): Promise<Invoice> {
  const row = await invoicesRepo.readInvoiceById(id);
  if (!row) throw new NotFoundError("Invoice not found");
  return withSubresources(mapInvoice(row));
}

export async function getCardChargesByGig(gigId: number): Promise<InvoiceCardCharge[]> {
  const rows = await invoicesRepo.readCardChargesByGigId(gigId);
  return rows.map(mapCardChargeWithInvoice);
}

export async function createInvoice(input: CreateInvoiceRequest): Promise<Invoice> {
  const { gigId, invoiceType = 'balance' } = input;
  if (!gigId) throw new BadRequestError("gigId is required");

  const [gig, lineItems, payments, existingCardCharges] = await Promise.all([
    gigsRepo.readGigById(gigId),
    gigLineItemsRepo.readGigLineItemsByGigId(gigId),
    paymentsRepo.readPaymentsByGigId(gigId),
    invoicesRepo.readCardChargesSumByGigId(gigId),
  ]);

  if (!gig) throw new NotFoundError("Gig not found");

  const subtotal = effectiveLineItemsSubtotal(lineItems);
  const discountAmount = Math.round(subtotal * gig.discount_percent / 100);
  const baseTotal = subtotal - discountAmount + gig.travel_cost;
  const total = invoiceType === 'balance'
    ? baseTotal + existingCardCharges
    : baseTotal;
  const paid = Math.max(0, payments.reduce((sum, p) => sum + p.amount, 0));
  const amountDue = invoiceType === 'deposit'
    ? Math.max(0, Math.round(baseTotal * 0.20) - paid)
    : Math.max(0, total - paid);

  const PG_INT_MAX = 2_147_483_647;
  if (total > PG_INT_MAX || amountDue > PG_INT_MAX) {
    console.error(`[createInvoice] Overflow: total=${total} amountDue=${amountDue} gigId=${gigId} invoiceType=${invoiceType} subtotal=${subtotal} discountAmount=${discountAmount} baseTotal=${baseTotal} travel=${gig.travel_cost} discountPct=${gig.discount_percent} existingCharges=${existingCardCharges} paid=${paid} lineItems=${JSON.stringify(lineItems)}`);
    throw new BadRequestError(`Invoice total (${total}) exceeds maximum allowed value`);
  }

  const today = todayDate();
  const year = today.slice(2, 4);

  return withTransaction(async () => {
    const seq = await invoicesRepo.nextInvoiceSequence(year);
    const invoiceNumber = `${year}-${String(seq).padStart(4, "0")}`;

    const row = await invoicesRepo.createInvoice({
      gigId,
      invoiceNumber,
      customerName: formatGigName(gig),
      eventDate: toDateString(gig.date) ?? undefined,
      venue: gig.venue_name ?? undefined,
      date: today,
      subtotalAmount: subtotal,
      discountPercent: gig.discount_percent,
      travelCost: gig.travel_cost,
      totalAmount: total,
      amountDue,
      invoiceType,
    });

    const [snappedLineItems, snappedPayments] = await Promise.all([
      Promise.all(
        lineItems.map((li) =>
          invoicesRepo.createLineItem(row.id, li.description, li.amount, li.discount_percent)
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
      cardCharges: [],
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
  
  const discountPercent = input.discountPercent ?? 0;
  validateDiscountPercent(discountPercent);
  
  // Check mutual exclusivity: cannot add item discount if invoice has overall discount
  if (discountPercent > 0 && inv.discount_percent > 0) {
    throw new BadRequestError("Cannot set an item-level discount while the invoice has an overall discount. Remove the overall discount first.");
  }
  
  const row = await invoicesRepo.createLineItem(
    invoiceId,
    input.description?.trim() ?? null,
    input.amount ?? null,
    discountPercent
  );
  return mapLineItem(row);
}

export async function removeLineItem(invoiceId: number, lineItemId: number): Promise<void> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");
  const deleted = await invoicesRepo.deleteLineItem(lineItemId);
  if (!deleted) throw new NotFoundError("LineItem not found");
}

const CreateCardChargeSchema = z.object({
  description: z.string().max(255).optional(),
  amount: z.number().int().min(0).max(2_147_483_647).optional(),
  recipientName: z.string().max(255).optional(),
});

export async function addCardCharge(
  invoiceId: number,
  body: unknown
): Promise<InvoiceCardCharge> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");

  const input = parseOrBadRequest(CreateCardChargeSchema, body) as CreateInvoiceCardChargeRequest;

  return withTransaction(async () => {
    // Create the linked expense first
    const expenseRow = await expensesRepo.createExpense({
      date: inv.date,
      amount: input.amount ?? 0,
      description: input.description?.trim() ?? 'Card charge',
      category: 'Processing fees',
      recipientName: input.recipientName?.trim(),
    });

    // Then create the card charge linked to it
    const chargeRow = await invoicesRepo.createCardCharge(
      inv.gig_id,
      invoiceId,
      input.description?.trim() ?? null,
      input.amount ?? null,
      expenseRow.id
    );

    await recalculateAmountDueForGig(inv.gig_id);
    return mapCardCharge(chargeRow);
  });
}

export async function addCardChargeToGig(
  gigId: number,
  invoiceId: number | null | undefined,
  body: unknown
): Promise<InvoiceCardCharge> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");

  let invoiceDate: string | undefined;
  let invoiceGigId = gigId;

  // If invoiceId is provided, validate it and use its date
  if (invoiceId) {
    const inv = await invoicesRepo.readInvoiceById(invoiceId);
    if (!inv) throw new NotFoundError("Invoice not found");
    if (inv.gig_id !== gigId) throw new BadRequestError("Invoice does not belong to this gig");
    invoiceDate = inv.date;
    invoiceGigId = inv.gig_id;
  } else {
    // Use gig date if no invoice specified
    invoiceDate = gig.date;
  }

  const input = parseOrBadRequest(CreateCardChargeSchema, body) as CreateInvoiceCardChargeRequest;

  return withTransaction(async () => {
    // Create the linked expense first
    const expenseRow = await expensesRepo.createExpense({
      date: invoiceDate,
      amount: input.amount ?? 0,
      description: input.description?.trim() ?? 'Card charge',
      category: 'Processing fees',
      recipientName: input.recipientName?.trim(),
    });

    // Then create the card charge (optionally linked to invoice)
    const chargeRow = await invoicesRepo.createCardCharge(
      gigId,
      invoiceId ?? null,
      input.description?.trim() ?? null,
      input.amount ?? null,
      expenseRow.id
    );

    // Recalculate amount due for the gig
    await recalculateAmountDueForGig(invoiceGigId);
    return mapCardCharge(chargeRow);
  });
}

export async function removeCardCharge(invoiceId: number, chargeId: number): Promise<void> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");

  return withTransaction(async () => {
    // Get the charge to find its linked expense
    const charge = await getCardChargeOrThrow(chargeId);
    const expenseId = charge.expense_id;

    // Delete the card charge
    const deleted = await invoicesRepo.deleteCardCharge(chargeId);
    if (!deleted) throw new NotFoundError("CardCharge not found");

    // Delete the linked expense (including any attached document)
    const expenseRow = await expensesRepo.readExpenseById(expenseId);
    if (expenseRow?.document_key) {
      await storage.tryDeleteFile(expenseRow.document_key);
    }
    await expensesRepo.deleteExpense(expenseId);

    await recalculateAmountDueForGig(inv.gig_id);
  });
}

export async function removeCardChargeByGig(gigId: number, chargeId: number): Promise<void> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");

  return withTransaction(async () => {
    // Get all gig charges and find the one we want
    const allCharges = await invoicesRepo.readCardChargesByGigId(gigId);
    const charge = allCharges.find(c => c.id === chargeId);
    if (!charge) throw new NotFoundError("CardCharge not found");

    const expenseId = charge.expense_id;

    // Delete the card charge
    const deleted = await invoicesRepo.deleteCardCharge(chargeId);
    if (!deleted) throw new NotFoundError("CardCharge not found");

    // Delete the linked expense (including any attached document)
    const expenseRow = await expensesRepo.readExpenseById(expenseId);
    if (expenseRow?.document_key) {
      await storage.tryDeleteFile(expenseRow.document_key);
    }
    await expensesRepo.deleteExpense(expenseId);

    await recalculateAmountDueForGig(gigId);
  });
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

export async function updateLineItem(
  invoiceId: number,
  lineItemId: number,
  input: UpdateInvoiceLineItemRequest
): Promise<InvoiceLineItem> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");
  
  const discountPercent = input.discountPercent ?? 0;
  validateDiscountPercent(discountPercent);
  
  // Check mutual exclusivity: cannot set item discount if invoice has overall discount
  if (discountPercent > 0 && inv.discount_percent > 0) {
    throw new BadRequestError("Cannot set an item-level discount while the invoice has an overall discount. Remove the overall discount first.");
  }
  
  const row = await invoicesRepo.updateLineItem(
    invoiceId,
    lineItemId,
    input.description?.trim() ?? null,
    input.amount ?? null,
    discountPercent
  );
  if (!row) throw new NotFoundError("LineItem not found");
  return mapLineItem(row);
}

const UpdateCardChargeSchema = z.object({
  invoiceId: z.number().int().positive().nullable().optional(),
  description: z.string().max(255).optional(),
  amount: z.number().int().min(0).max(2_147_483_647).optional(),
  recipientName: z.string().max(255).optional(),
});

export async function updateCardCharge(
  invoiceId: number,
  chargeId: number,
  body: unknown
): Promise<InvoiceCardCharge> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");

  const input = parseOrBadRequest(UpdateCardChargeSchema, body) as UpdateInvoiceCardChargeRequest;

  return withTransaction(async () => {
    // Get the card charge to find its linked expense
    const charge = await getCardChargeOrThrow(chargeId);
    const expenseId = charge.expense_id;

    // Update the card charge (keep it linked to the same invoice in this endpoint)
    const row = await invoicesRepo.updateCardCharge(
      invoiceId,
      chargeId,
      input.description?.trim() ?? null,
      input.amount ?? null
    );
    if (!row) throw new NotFoundError("CardCharge not found");

    // Sync the linked expense from the updated card charge (amount/description
    // mirror the charge exactly, matching its clear-on-omit semantics); other
    // fields (date, category, airtableId) stay as they were on the expense.
    const expenseRow = await expensesRepo.readExpenseById(expenseId);
    if (expenseRow) {
      await expensesRepo.updateExpense(expenseId, {
        amount: row.amount ?? 0,
        description: row.description ?? 'Card charge',
        date: expenseRow.date ?? undefined,
        category: expenseRow.category ?? undefined,
        recipientName: input.recipientName?.trim() ?? expenseRow.recipient_name ?? undefined,
        airtableId: expenseRow.airtable_id ?? undefined,
      });
    }

    await recalculateAmountDueForGig(inv.gig_id);
     return mapCardCharge(row);
   });
 }

 export async function updateCardChargeByGig(
   gigId: number,
   chargeId: number,
   body: unknown
 ): Promise<InvoiceCardCharge> {
   const gig = await gigsRepo.readGigById(gigId);
   if (!gig) throw new NotFoundError("Gig not found");

   const input = parseOrBadRequest(UpdateCardChargeSchema, body) as UpdateInvoiceCardChargeRequest;

   return withTransaction(async () => {
     // Get the card charge
     const charge = await getCardChargeOrThrow(chargeId);
     if (charge.gig_id !== gigId) throw new ForbiddenError("Card charge does not belong to this gig");

     const oldInvoiceId = charge.invoice_id;
     const newInvoiceId = 'invoiceId' in input ? input.invoiceId : oldInvoiceId;
     const expenseId = charge.expense_id;

     // If a new invoiceId is provided, validate it
     if (newInvoiceId !== undefined && newInvoiceId !== oldInvoiceId) {
       if (newInvoiceId !== null) {
         const inv = await invoicesRepo.readInvoiceById(newInvoiceId);
         if (!inv) throw new NotFoundError("Invoice not found");
         if (inv.gig_id !== gigId) throw new BadRequestError("Invoice does not belong to this gig");
       }
     }

     // Update the card charge with new invoice ID if changed
     const row = await invoicesRepo.updateCardCharge(
       newInvoiceId ?? null,
       chargeId,
       input.description?.trim() ?? null,
       input.amount ?? null
     );
     if (!row) throw new NotFoundError("CardCharge not found");

     // Sync the linked expense
     const expenseRow = await expensesRepo.readExpenseById(expenseId);
     if (expenseRow) {
       await expensesRepo.updateExpense(expenseId, {
         amount: row.amount ?? 0,
         description: row.description ?? 'Card charge',
         date: expenseRow.date ?? undefined,
         category: expenseRow.category ?? undefined,
         recipientName: input.recipientName?.trim() ?? expenseRow.recipient_name ?? undefined,
         airtableId: expenseRow.airtable_id ?? undefined,
       });
     }

     // Recalculate for both old and new invoices if they changed
     if (oldInvoiceId) await recalculateAmountDueForGig(gigId);
     if (newInvoiceId && newInvoiceId !== oldInvoiceId) await recalculateAmountDueForGig(gigId);

     return mapCardCharge(row);
   });
 }

 export async function updatePaymentMade(
  invoiceId: number,
  paymentMadeId: number,
  input: UpdateInvoicePaymentMadeRequest
): Promise<InvoicePaymentMade> {
  const inv = await invoicesRepo.readInvoiceById(invoiceId);
  if (!inv) throw new NotFoundError("Invoice not found");
  const row = await invoicesRepo.updatePaymentMade(
    invoiceId,
    paymentMadeId,
    input.description?.trim() ?? null,
    input.date ?? null,
    input.amount ?? null
  );
  if (!row) throw new NotFoundError("PaymentMade not found");
  return mapPaymentMade(row);
}

/**
 * Build the Flask payload from live gig account data (no DB write).
 * Used for the invoice preview endpoint.
 */
export async function buildPreviewPayloadForGig(
  gigId: number,
  invoiceType: 'deposit' | 'balance' = 'balance'
): Promise<Record<string, unknown>> {
  const [gig, lineItems, payments, existingCardCharges] = await Promise.all([
    gigsRepo.readGigById(gigId),
    gigLineItemsRepo.readGigLineItemsByGigId(gigId),
    paymentsRepo.readPaymentsByGigId(gigId),
    invoicesRepo.readCardChargesSumByGigId(gigId),
  ]);

  if (!gig) throw new NotFoundError("Gig not found");

  // For a balance preview, pre-populate card charges from existing
  // invoices (e.g. a card surcharge on the deposit invoice) so the total
  // and amount-due are correct. For deposit previews, start fresh.
  const cardCharges = invoiceType === 'balance' && existingCardCharges > 0
    ? [{ description: "Existing card charges", amount: existingCardCharges }]
    : [];

  const year = new Date().toISOString().slice(2, 4);
  const seq = await invoicesRepo.peekNextInvoiceSequence(year);
  const invoiceNumber = `${year}-${String(seq).padStart(4, "0")} (PREVIEW)`;

  return {
    ...buildBaseFlaskPayload({
      invoiceNumber,
      customerName: formatGigName(gig),
      eventDate: toDateString(gig.date) ?? undefined,
      venue: gig.venue_name ?? undefined,
      lineItems: lineItems.map(mapGigLineItem),
      cardCharges,
      discountPercent: gig.discount_percent,
      travelCost: gig.travel_cost,
    }),
    payment_made: payments.map(toFlaskPaymentItem),
    ...(invoiceType === 'deposit' && { deposit_only: true }),
    ...(invoiceType === 'balance' && { show_deposit: false }),
  };
}

export async function linkPayment(invoiceId: number, paymentId: number): Promise<void> {
  const [invoice, payment] = await Promise.all([
    invoicesRepo.readInvoiceById(invoiceId),
    paymentsRepo.readPaymentById(paymentId),
  ]);
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (!payment) throw new NotFoundError("Payment not found");
  if (invoice.gig_id !== payment.gig_id)
    throw new BadRequestError("Payment does not belong to the same gig as this invoice");
  await paymentsRepo.setPaymentInvoiceLink(paymentId, invoiceId);
}

export async function unlinkPayment(invoiceId: number, paymentId: number): Promise<void> {
  const [invoice, payment] = await Promise.all([
    invoicesRepo.readInvoiceById(invoiceId),
    paymentsRepo.readPaymentById(paymentId),
  ]);
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (!payment) throw new NotFoundError("Payment not found");
  if (payment.invoice_id !== invoiceId)
    throw new BadRequestError("Payment is not linked to this invoice");
  await paymentsRepo.setPaymentInvoiceLink(paymentId, null);
}

/**
 * Recalculate and persist the `amount_due` for every invoice linked to a gig,
 * based on payments received. Refunds are not included; they are reflected
 * separately in the financial summary. Called whenever payments change.
 */
export async function recalculateAmountDueForGig(gigId: number): Promise<void> {
  return withTransaction(async () => {
    const [invoices, payments] = await Promise.all([
      invoicesRepo.readInvoicesByGigId(gigId),
      paymentsRepo.readPaymentsByGigId(gigId),
    ]);

    const paid = payments.reduce((s, p) => s + p.amount, 0);
    // Defensive: paid should never be negative. A negative value would indicate
    // a payment with a negative amount in the DB (data corruption), and would
    // cause amountDue to overflow PostgreSQL's integer column.
    const safePaid = Math.max(0, paid);

    const chargeSums = await invoicesRepo.readCardChargesSumsByInvoiceIds(
      invoices.map(inv => inv.id)
    );

    // Iterate sequentially — pg's client cannot handle concurrent queries on the
    // same transaction connection.
    for (const inv of invoices) {
      const invoiceCharges = chargeSums.get(inv.id) ?? 0;
      // Deposit invoices store total_amount as the service-only subtotal (no surcharges).
      // The expected payment is 20% of that service total plus any surcharges on this invoice.
      const expected = inv.invoice_type === "deposit"
        ? Math.round(inv.total_amount * 0.2) + invoiceCharges
        : inv.total_amount + invoiceCharges;
      let amountDue = Math.max(0, expected - safePaid);
      if (amountDue > 2_147_483_647) {
        console.error(`[recalculateAmountDueForGig] Overflow: amountDue=${amountDue} invoiceId=${inv.id} invoiceType=${inv.invoice_type} total_amount=${inv.total_amount} charges=${invoiceCharges} expected=${expected} safePaid=${safePaid}`);
        amountDue = 0;
      }
      await invoicesRepo.updateAmountDue(inv.id, amountDue);
    }
  });
}

/**
 * Build the Flask payload for receipt generation.
 * Uses the real linked payments (from the payments table) rather than the
 * snapshotted invoice_payments_made, so the receipt reflects actual received
 * payments with their real dates and amounts.
 */
export async function buildReceiptPayload(id: number): Promise<Record<string, unknown>> {
  const [invoice, linkedPayments] = await Promise.all([
    getInvoiceById(id),
    paymentsRepo.readPaymentsByInvoiceId(id),
  ]);

  return {
    ...buildBaseFlaskPayload(invoice),
    payment_made: [
      ...(invoice.paymentsMade ?? []).map(toFlaskPaymentItem),
      ...linkedPayments.map(toFlaskPaymentItem),
    ],
    ...(invoice.invoiceType === 'balance' && { show_deposit: false }),
  };
}

/**
 * Build the payload expected by the Python Flask invoice service.
 * DB amounts are stored as integer pennies; Flask expects floats in pounds.
 */
export async function buildInvoicePayload(id: number): Promise<Record<string, unknown>> {
  const invoice = await getInvoiceById(id);

  return {
    ...buildBaseFlaskPayload(invoice),
    payment_made: (invoice.paymentsMade ?? []).map(toFlaskPaymentItem),
    ...(invoice.invoiceType === 'deposit' && { deposit_only: true }),
    ...(invoice.invoiceType === 'balance' && { show_deposit: false }),
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
    invoiceType: row.invoice_type,
  };
}

function mapLineItem(row: invoicesRepo.InvoiceLineItemRow): InvoiceLineItem {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description ?? undefined,
    amount: row.amount ?? undefined,
    discountPercent: row.discount_percent,
  };
}

function mapCardCharge(row: invoicesRepo.InvoiceCardChargeRow): InvoiceCardCharge {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description ?? undefined,
    amount: row.amount ?? undefined,
    expenseId: row.expense_id,
  };
}

function mapCardChargeWithInvoice(row: invoicesRepo.CardChargeWithInvoiceRow): InvoiceCardCharge {
  return {
    ...mapCardCharge(row),
    invoiceNumber: row.invoice_number,
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
  const [lineItems, cardCharges, paymentsMade] = await Promise.all([
    invoicesRepo.readLineItemsByInvoiceId(invoice.id),
    invoicesRepo.readCardChargesByInvoiceId(invoice.id),
    invoicesRepo.readPaymentsMadeByInvoiceId(invoice.id),
  ]);
  let finalCharges = cardCharges.map(mapCardCharge);
  // Balance invoices have the inherited charges baked into totalAmount at creation
  // time, but the individual charge records live on the deposit invoice.  When the
  // balance invoice has no charges of its own, pull in the gig-level charges so
  // the invoice view and PDF show the full breakdown.  Flask computes the total
  // charges must be present here to produce the correct total on the PDF.
  if (finalCharges.length === 0 && invoice.invoiceType === 'balance') {
    const gigCharges = await invoicesRepo.readCardChargesByGigId(invoice.gigId);
    finalCharges = gigCharges.map(mapCardChargeWithInvoice);
  }
  return {
    ...invoice,
    lineItems: lineItems.map(mapLineItem),
    cardCharges: finalCharges,
    paymentsMade: paymentsMade.map(mapPaymentMade),
  };
}

// ── Flask payload helpers ──────────────────────────────────────────────────

function toFlaskLineItem(item: { description?: string | null; amount?: number | null; discountPercent?: number }) {
  const discountPercent = item.discountPercent ?? 0;
  const amount = item.amount ?? 0;
  const discountedAmount = applyItemDiscount(amount, discountPercent);
  
  let description = item.description ?? "";
  if (discountPercent > 0) {
    description = `${description} (${discountPercent}% discount applied)`;
  }
  
  return { description, price: discountedAmount / 100 };
}

function toFlaskPaymentItem(item: { description?: string | null; amount?: number | null; date?: string | null }) {
  return {
    description: item.description || "Payment received",
    price: (item.amount ?? 0) / 100,
    ...(item.date != null && { date: item.date }),
  };
}

function buildBaseFlaskPayload(invoice: {
  invoiceNumber: string;
  customerName: string;
  eventDate?: string;
  venue?: string;
  lineItems?: Array<{ description?: string | null; amount?: number | null; discountPercent?: number }>;
  cardCharges?: Array<{ description?: string | null; amount?: number | null }>;
  discountPercent: number;
  travelCost: number;
}) {
  return {
    invoice_number: invoice.invoiceNumber,
    customer_name: invoice.customerName,
    event_date: invoice.eventDate ?? "",
    venue: invoice.venue ?? "",
    custom_items: (invoice.lineItems ?? []).map(toFlaskLineItem),
    // Flask's payload key remains "additional_charges" (a generic term on
    // that side); the API's own naming for this concept is "card charges".
    additional_charges: (invoice.cardCharges ?? []).map(toFlaskLineItem),
    discount_percent: invoice.discountPercent > 0 ? invoice.discountPercent : undefined,
    travel_cost: invoice.travelCost > 0 ? invoice.travelCost / 100 : undefined,
  };
}

async function getCardChargeOrThrow(chargeId: number): Promise<invoicesRepo.InvoiceCardChargeRow> {
  const charge = await invoicesRepo.readCardChargeById(chargeId);
  if (!charge) throw new NotFoundError("CardCharge not found");
  return charge;
}

function buildMutationInput(
  input: UpdateInvoiceRequest,
  existing?: Invoice
): invoicesRepo.InvoiceMutationInput {
  const gigId = existing?.gigId;
  if (!gigId) throw new BadRequestError("gigId is required");
  const invoiceNumber = existing?.invoiceNumber;
  if (!invoiceNumber) throw new BadRequestError("invoiceNumber is required");
  if (input.invoiceNumber && input.invoiceNumber.trim() !== invoiceNumber)
    throw new BadRequestError("Invoice number cannot be changed");
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
    invoiceType: input.invoiceType ?? existing?.invoiceType ?? 'balance',
  };
}


