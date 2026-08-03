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
  invoice_type: 'deposit' | 'balance';
}

export interface InvoiceLineItemRow {
  id: number;
  invoice_id: number;
  description: string | null;
  amount: number | null;
  discount_percent: number;
}

export interface InvoiceCardChargeRow {
  id: number;
  gig_id: number;
  invoice_id: number | null;
  description: string | null;
  amount: number | null;
  expense_id: number;
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
  invoiceType: 'deposit' | 'balance';
}

const INVOICE_COLS = `
  id, gig_id, invoice_number, customer_name, event_date, venue, date,
  subtotal_amount, discount_percent, travel_cost, total_amount, amount_due, invoice_type
`;

export async function createInvoice(input: InvoiceMutationInput): Promise<InvoiceRow> {
  const [row] = await run_query<InvoiceRow>({
      text: `
      INSERT INTO invoices (
        gig_id, invoice_number, customer_name, event_date, venue, date,
        subtotal_amount, discount_percent, travel_cost, total_amount, amount_due,
        invoice_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        input.invoiceType,
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
  // next_seq holds the current value; the real sequence increments before returning,
  // so add 1 to match what the next created invoice will actually receive.
  return rows[0] ? parseInt(rows[0].next_seq, 10) + 1 : 1;
}

export async function readInvoiceById(id: number): Promise<InvoiceRow | null> {
  const rows = await run_query<InvoiceRow>({
    text: `SELECT ${INVOICE_COLS} FROM invoices WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function readAllInvoices(): Promise<InvoiceRow[]> {
  return run_query<InvoiceRow>({
    text: `SELECT ${INVOICE_COLS} FROM invoices ORDER BY date DESC;`,
  });
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
          total_amount = $10, amount_due = $11, invoice_type = $12
      WHERE id = $13
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
      input.invoiceType,
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
    text: `SELECT id, invoice_id, description, amount, discount_percent FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id;`,
    values: [invoiceId],
  });
}

export async function createLineItem(
  invoiceId: number,
  description: string | null,
  amount: number | null,
  discountPercent: number = 0
): Promise<InvoiceLineItemRow> {
  const [row] = await run_query<InvoiceLineItemRow>({
    text: `INSERT INTO invoice_line_items (invoice_id, description, amount, discount_percent) VALUES ($1, $2, $3, $4) RETURNING id, invoice_id, description, amount, discount_percent;`,
    values: [invoiceId, description, amount, discountPercent],
  });
  return row!;
}

export async function updateLineItem(
  invoiceId: number,
  id: number,
  description: string | null,
  amount: number | null,
  discountPercent: number = 0
): Promise<InvoiceLineItemRow | null> {
  const rows = await run_query<InvoiceLineItemRow>({
    text: `UPDATE invoice_line_items SET description = $1, amount = $2, discount_percent = $3 WHERE id = $4 AND invoice_id = $5 RETURNING id, invoice_id, description, amount, discount_percent;`,
    values: [description, amount, discountPercent, id, invoiceId],
  });
  return rows[0] ?? null;
}

export async function deleteLineItem(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM invoice_line_items WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

// --- Card charges ---

export async function readCardChargesByInvoiceId(
  invoiceId: number
): Promise<InvoiceCardChargeRow[]> {
  return run_query<InvoiceCardChargeRow>({
    text: `SELECT id, gig_id, invoice_id, description, amount, expense_id FROM invoice_card_charges WHERE invoice_id = $1 ORDER BY id;`,
    values: [invoiceId],
  });
}

export async function readCardChargeById(
  chargeId: number
): Promise<InvoiceCardChargeRow | undefined> {
  const rows = await run_query<InvoiceCardChargeRow>({
    text: `SELECT id, gig_id, invoice_id, description, amount, expense_id FROM invoice_card_charges WHERE id = $1;`,
    values: [chargeId],
  });
  return rows[0];
}

export async function createCardCharge(
  gigId: number,
  invoiceId: number | null,
  description: string | null,
  amount: number | null,
  expenseId: number
): Promise<InvoiceCardChargeRow> {
  const [row] = await run_query<InvoiceCardChargeRow>({
    text: `INSERT INTO invoice_card_charges (gig_id, invoice_id, description, amount, expense_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, gig_id, invoice_id, description, amount, expense_id;`,
    values: [gigId, invoiceId, description, amount, expenseId],
  });
  return row!;
}

export async function updateCardCharge(
  invoiceId: number | null,
  id: number,
  description: string | null,
  amount: number | null
): Promise<InvoiceCardChargeRow | null> {
  const rows = await run_query<InvoiceCardChargeRow>({
    text: `UPDATE invoice_card_charges SET description = $1, amount = $2 WHERE id = $3 AND invoice_id = $4 RETURNING id, invoice_id, description, amount, expense_id;`,
    values: [description, amount, id, invoiceId],
  });
  return rows[0] ?? null;
}

export async function deleteCardCharge(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM invoice_card_charges WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

export interface CardChargeWithInvoiceRow extends InvoiceCardChargeRow {
  invoice_number: string;
  gig_id: number;
}

/** Return all card charges across all invoices for a gig, ordered by charge id. */
export async function readCardChargesByGigId(gigId: number): Promise<CardChargeWithInvoiceRow[]> {
  return run_query<CardChargeWithInvoiceRow>({
    text: `
      SELECT icc.id, icc.invoice_id, inv.invoice_number, icc.description, icc.amount, icc.expense_id, icc.gig_id
      FROM invoice_card_charges icc
      LEFT JOIN invoices inv ON inv.id = icc.invoice_id
      WHERE icc.gig_id = $1
      ORDER BY icc.id;
    `,
    values: [gigId],
  });
}

/** Return the sum of all card charge amounts for a single invoice. Returns 0 when none exist. */
export async function readCardChargesSumByInvoiceId(invoiceId: number): Promise<number> {
  const rows = await run_query<{ total: number | null }>({
    text: `SELECT COALESCE(SUM(amount), 0) AS total FROM invoice_card_charges WHERE invoice_id = $1;`,
    values: [invoiceId],
  });
  // SUM() returns bigint; pg v8 returns bigint as string. Convert to number to avoid
  // string concatenation in JS arithmetic (e.g. "100" + 200 = "100200" instead of 300).
  return Number(rows[0]?.total ?? 0);
}

/** Return the sum of card charge amounts grouped by invoice ID for a set of invoices.
 *  Invoices with no charges are omitted from the result — use `chargeSums.get(id) ?? 0` on the returned Map. */
export async function readCardChargesSumsByInvoiceIds(
  invoiceIds: number[]
): Promise<Map<number, number>> {
  if (invoiceIds.length === 0) return new Map();
  const rows = await run_query<{ invoice_id: number; total: number | null }>({
    text: `
      SELECT invoice_id, COALESCE(SUM(amount), 0) AS total
      FROM invoice_card_charges
      WHERE invoice_id = ANY($1)
      GROUP BY invoice_id
    `,
    values: [invoiceIds],
  });
  // SUM() returns bigint; pg v8 returns bigint as string. Convert to number to avoid
  // string concatenation in JS arithmetic.
  return new Map(rows.map(r => [r.invoice_id, Number(r.total ?? 0)]));
}

/** Return the sum of all card charge amounts across all invoices for a gig. Returns 0 when none exist. */
export async function readCardChargesSumByGigId(gigId: number): Promise<number> {
  const rows = await run_query<{ total: number | null }>({
    text: `
      SELECT COALESCE(SUM(icc.amount), 0) AS total
      FROM invoices inv
      JOIN invoice_card_charges icc ON icc.invoice_id = inv.id
      WHERE inv.gig_id = $1;
    `,
    values: [gigId],
  });
  // SUM() returns bigint; pg v8 returns bigint as string. Convert to number to avoid
  // string concatenation in JS arithmetic (e.g. "100" + 200 = "100200" instead of 300).
  return Number(rows[0]?.total ?? 0);
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

export async function updatePaymentMade(
  invoiceId: number,
  id: number,
  description: string | null,
  date: string | null,
  amount: number | null
): Promise<InvoicePaymentMadeRow | null> {
  const rows = await run_query<InvoicePaymentMadeRow>({
    text: `UPDATE invoice_payments_made SET description = $1, date = $2, amount = $3 WHERE id = $4 AND invoice_id = $5 RETURNING id, invoice_id, description, date, amount;`,
    values: [description, date, amount, id, invoiceId],
  });
  return rows[0] ?? null;
}

export async function deletePaymentMade(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM invoice_payments_made WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

export async function updateAmountDue(id: number, amountDue: number): Promise<void> {
  await run_query({
    text: `UPDATE invoices SET amount_due = $1 WHERE id = $2;`,
    values: [amountDue, id],
  });
}
