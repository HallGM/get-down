import { run_query } from "../db/init.js";
import { groupById } from "../utils/groupById.js";

export interface PersonInvoiceRow {
  id: number;
  person_id: number;
  invoice_number: string;
  date: string;
  total_amount: number;
  expense_id: number;
}

export interface PersonInvoiceLineItemRow {
  id: number;
  person_invoice_id: number;
  description: string | null;
  amount: number | null;
}

export interface PersonInvoiceMutationInput {
  personId: number;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  expenseId: number;
}

const PERSON_INVOICE_COLS = `
  id, person_id, invoice_number, date, total_amount, expense_id
`;

// --- Person Invoices ---

export async function createPersonInvoice(
  input: PersonInvoiceMutationInput
): Promise<PersonInvoiceRow> {
  const [row] = await run_query<PersonInvoiceRow>({
    text: `
      INSERT INTO person_invoices (person_id, invoice_number, date, total_amount, expense_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${PERSON_INVOICE_COLS};
    `,
    values: [
      input.personId,
      input.invoiceNumber,
      input.date,
      input.totalAmount,
      input.expenseId,
    ],
  });
  return row!;
}

export async function readPersonInvoiceById(id: number): Promise<PersonInvoiceRow | null> {
  const rows = await run_query<PersonInvoiceRow>({
    text: `SELECT ${PERSON_INVOICE_COLS} FROM person_invoices WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function readPersonInvoicesByPersonId(
  personId: number
): Promise<PersonInvoiceRow[]> {
  return run_query<PersonInvoiceRow>({
    text: `SELECT ${PERSON_INVOICE_COLS} FROM person_invoices WHERE person_id = $1 ORDER BY date DESC, id DESC;`,
    values: [personId],
  });
}

export async function readAllPersonInvoices(): Promise<PersonInvoiceRow[]> {
  return run_query<PersonInvoiceRow>({
    text: `SELECT ${PERSON_INVOICE_COLS} FROM person_invoices ORDER BY date DESC, id DESC;`,
  });
}

export async function readNextInvoiceNumber(): Promise<{ next_person_invoice_number: string } | null> {
  const rows = await run_query<{ next_person_invoice_number: string }>({
    text: `SELECT next_person_invoice_number();`,
  });
  return rows[0] ?? null;
}

export async function updatePersonInvoice(
  id: number,
  date: string,
  totalAmount: number
): Promise<PersonInvoiceRow | null> {
  const rows = await run_query<PersonInvoiceRow>({
    text: `
      UPDATE person_invoices
      SET date = $2, total_amount = $3
      WHERE id = $1
      RETURNING ${PERSON_INVOICE_COLS};
    `,
    values: [id, date, totalAmount],
  });
  return rows[0] ?? null;
}

export async function deletePersonInvoice(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM person_invoices WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

// --- Person Invoice Line Items ---

export async function readLineItemsByPersonInvoiceId(
  personInvoiceId: number
): Promise<PersonInvoiceLineItemRow[]> {
  return run_query<PersonInvoiceLineItemRow>({
    text: `SELECT id, person_invoice_id, description, amount FROM person_invoice_line_items WHERE person_invoice_id = $1 ORDER BY id;`,
    values: [personInvoiceId],
  });
}

export async function createLineItem(
  personInvoiceId: number,
  description: string | null,
  amount: number | null
): Promise<PersonInvoiceLineItemRow> {
  const [row] = await run_query<PersonInvoiceLineItemRow>({
    text: `INSERT INTO person_invoice_line_items (person_invoice_id, description, amount) VALUES ($1, $2, $3) RETURNING id, person_invoice_id, description, amount;`,
    values: [personInvoiceId, description, amount],
  });
  return row!;
}

export async function deleteLineItemsByPersonInvoiceId(
  personInvoiceId: number
): Promise<boolean> {
  const rows = await run_query<{ person_invoice_id: number }>({
    text: `DELETE FROM person_invoice_line_items WHERE person_invoice_id = $1 RETURNING person_invoice_id;`,
    values: [personInvoiceId],
  });
  return rows.length > 0;
}

// ─── Person Invoice by Expense ID ─────────────────────────────────────────────

export interface PersonInvoiceByExpenseRow {
  id: number;
  invoice_number: string;
  person_id: number;
}

export async function readPersonInvoiceByExpenseId(expenseId: number): Promise<PersonInvoiceByExpenseRow | null> {
  const rows = await run_query<PersonInvoiceByExpenseRow>({
    text: `SELECT id, invoice_number, person_id FROM person_invoices WHERE expense_id = $1 LIMIT 1;`,
    values: [expenseId],
  });
  return rows[0] ?? null;
}

export async function readPersonInvoicesByExpenseIds(
  expenseIds: number[]
): Promise<Map<number, PersonInvoiceByExpenseRow>> {
  if (expenseIds.length === 0) return new Map();
  const rows = await run_query<{ expense_id: number } & PersonInvoiceByExpenseRow>({
    text: `
      SELECT expense_id, id, invoice_number, person_id
      FROM person_invoices
      WHERE expense_id = ANY($1::int[]);
    `,
    values: [expenseIds],
  });
  const result = new Map<number, PersonInvoiceByExpenseRow>();
  rows.forEach((row) => {
    result.set(row.expense_id, { id: row.id, invoice_number: row.invoice_number, person_id: row.person_id });
  });
  return result;
}
