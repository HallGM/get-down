import { run_query } from "../db/init.js";

export interface LegacyInvoiceRow {
  id: number;
  gig_id: number;
  invoice_number: string | null;
  date: string | null;
  description: string | null;
  document_key: string | null;
}

export interface LegacyInvoiceMutationInput {
  gigId: number;
  invoiceNumber?: string | null;
  date?: string | null;
  description?: string | null;
  documentKey: string;
}

const SELECT_COLS = `id, gig_id, invoice_number, date, description, document_key`;

export async function createLegacyInvoice(input: LegacyInvoiceMutationInput): Promise<LegacyInvoiceRow> {
  const rows = await run_query<LegacyInvoiceRow>({
    text: `
      INSERT INTO legacy_invoices (gig_id, invoice_number, date, description, document_key)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.gigId,
      input.invoiceNumber ?? null,
      input.date ?? null,
      input.description ?? null,
      input.documentKey,
    ],
  });
  return rows[0];
}

export async function readLegacyInvoicesByGigId(gigId: number): Promise<LegacyInvoiceRow[]> {
  return run_query<LegacyInvoiceRow>({
    text: `SELECT ${SELECT_COLS} FROM legacy_invoices WHERE gig_id = $1 ORDER BY id DESC;`,
    values: [gigId],
  });
}

export async function readLegacyInvoiceById(id: number): Promise<LegacyInvoiceRow | null> {
  const rows = await run_query<LegacyInvoiceRow>({
    text: `SELECT ${SELECT_COLS} FROM legacy_invoices WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateLegacyInvoice(
  id: number,
  input: LegacyInvoiceMutationInput
): Promise<LegacyInvoiceRow | null> {
  const rows = await run_query<LegacyInvoiceRow>({
    text: `
      UPDATE legacy_invoices
      SET invoice_number = $1, date = $2, description = $3, document_key = $4
      WHERE id = $5
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.invoiceNumber ?? null,
      input.date ?? null,
      input.description ?? null,
      input.documentKey,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function deleteLegacyInvoice(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM legacy_invoices WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
