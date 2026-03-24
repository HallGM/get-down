import { run_query } from "../db/init.js";

export interface InvoiceRow {
  id: number;
  gig_id: number;
  invoice_number: string;
  customer_name: string;
  event_date: string | null;
  venue: string | null;
  date: string;
  subtotal_amount: number;
  discount_percent: number;
  travel_cost: number;
  total_amount: number;
  amount_due: number;
}

export interface InvoiceLineItemRow {
  id: number;
  invoice_id: number;
  description: string | null;
  amount: number | null;
}

export interface InvoiceAdditionalChargeRow {
  id: number;
  invoice_id: number;
  description: string | null;
  amount: number | null;
}

export interface InvoicePaymentMadeRow {
  id: number;
  invoice_id: number;
  description: string | null;
  date: string | null;
  amount: number | null;
}

export interface InvoiceMutationInput {
  gigId: number;
  invoiceNumber: string;
  customerName: string;
  eventDate?: string;
  venue?: string;
  date: string;
  subtotalAmount: number;
  discountPercent: number;
  travelCost: number;
  totalAmount: number;
  amountDue: number;
}

const INVOICE_COLS = `
  id, gig_id, invoice_number, customer_name, event_date, venue, date,
  subtotal_amount, discount_percent, travel_cost, total_amount, amount_due
`;

export async function createInvoice(input: InvoiceMutationInput): Promise<InvoiceRow> {
  const [row] = await run_query<InvoiceRow>({
      text: `
      INSERT INTO invoices (
        gig_id, invoice_number, customer_name, event_date, venue, date,
        subtotal_amount, discount_percent, travel_cost, total_amount, amount_due
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING ${INVOICE_COLS};
    `,
      values: [
        input.gigId,
        input.invoiceNumber,
        input.customerName,
        input.eventDate ?? null,
        input.venue ?? null,
        input.date,
        input.subtotalAmount,
        input.discountPercent,
        input.travelCost,
        input.totalAmount,
        input.amountDue,
      ],
    });
  return row!;
}

export async function nextInvoiceSequence(year: string): Promise<number> {
  const rows = await run_query<{ next_seq: string }>({
    text: `
      INSERT INTO invoice_sequences (year, next_seq)
      VALUES ($1, 1)
      ON CONFLICT (year) DO UPDATE
        SET next_seq = invoice_sequences.next_seq + 1
      RETURNING next_seq;
    `,
    values: [year],
  });
  return parseInt(rows[0]!.next_seq, 10);
}

export async function peekNextInvoiceSequence(year: string): Promise<number> {
  const rows = await run_query<{ next_seq: string }>({
    text: `SELECT next_seq FROM invoice_sequences WHERE year = $1;`,
    values: [year],
  });
  return rows[0] ? parseInt(rows[0].next_seq, 10) : 1;
}

export async function readInvoiceById(id: number): Promise<InvoiceRow | null> {
  const rows = await run_query<InvoiceRow>({
    text: `SELECT ${INVOICE_COLS} FROM invoices WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function readInvoicesByGigId(gigId: number): Promise<InvoiceRow[]> {
  return run_query<InvoiceRow>({
    text: `SELECT ${INVOICE_COLS} FROM invoices WHERE gig_id = $1 ORDER BY date DESC;`,
    values: [gigId],
  });
}

export async function updateInvoice(
  id: number,
  input: InvoiceMutationInput
): Promise<InvoiceRow | null> {
  const rows = await run_query<InvoiceRow>({
    text: `
      UPDATE invoices
      SET gig_id = $1, invoice_number = $2, customer_name = $3, event_date = $4, venue = $5,
          date = $6, subtotal_amount = $7, discount_percent = $8, travel_cost = $9,
          total_amount = $10, amount_due = $11
      WHERE id = $12
      RETURNING ${INVOICE_COLS};
    `,
    values: [
      input.gigId,
      input.invoiceNumber,
      input.customerName,
      input.eventDate ?? null,
      input.venue ?? null,
      input.date,
      input.subtotalAmount,
      input.discountPercent,
      input.travelCost,
      input.totalAmount,
      input.amountDue,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function deleteInvoice(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM invoices WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

// --- Line items ---

export async function readLineItemsByInvoiceId(
  invoiceId: number
): Promise<InvoiceLineItemRow[]> {
  return run_query<InvoiceLineItemRow>({
    text: `SELECT id, invoice_id, description, amount FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id;`,
    values: [invoiceId],
  });
}

export async function createLineItem(
  invoiceId: number,
  description: string | null,
  amount: number | null
): Promise<InvoiceLineItemRow> {
  const [row] = await run_query<InvoiceLineItemRow>({
    text: `INSERT INTO invoice_line_items (invoice_id, description, amount) VALUES ($1, $2, $3) RETURNING id, invoice_id, description, amount;`,
    values: [invoiceId, description, amount],
  });
  return row!;
}

export async function deleteLineItem(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM invoice_line_items WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

// --- Additional charges ---

export async function readAdditionalChargesByInvoiceId(
  invoiceId: number
): Promise<InvoiceAdditionalChargeRow[]> {
  return run_query<InvoiceAdditionalChargeRow>({
    text: `SELECT id, invoice_id, description, amount FROM invoice_additional_charges WHERE invoice_id = $1 ORDER BY id;`,
    values: [invoiceId],
  });
}

export async function createAdditionalCharge(
  invoiceId: number,
  description: string | null,
  amount: number | null
): Promise<InvoiceAdditionalChargeRow> {
  const [row] = await run_query<InvoiceAdditionalChargeRow>({
    text: `INSERT INTO invoice_additional_charges (invoice_id, description, amount) VALUES ($1, $2, $3) RETURNING id, invoice_id, description, amount;`,
    values: [invoiceId, description, amount],
  });
  return row!;
}

export async function deleteAdditionalCharge(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM invoice_additional_charges WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

// --- Payments made ---

export async function readPaymentsMadeByInvoiceId(
  invoiceId: number
): Promise<InvoicePaymentMadeRow[]> {
  return run_query<InvoicePaymentMadeRow>({
    text: `SELECT id, invoice_id, description, date, amount FROM invoice_payments_made WHERE invoice_id = $1 ORDER BY date, id;`,
    values: [invoiceId],
  });
}

export async function createPaymentMade(
  invoiceId: number,
  description: string | null,
  date: string | null,
  amount: number | null
): Promise<InvoicePaymentMadeRow> {
  const [row] = await run_query<InvoicePaymentMadeRow>({
    text: `INSERT INTO invoice_payments_made (invoice_id, description, date, amount) VALUES ($1, $2, $3, $4) RETURNING id, invoice_id, description, date, amount;`,
    values: [invoiceId, description, date, amount],
  });
  return row!;
}

export async function deletePaymentMade(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM invoice_payments_made WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
