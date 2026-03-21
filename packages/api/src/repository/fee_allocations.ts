import { run_query } from "../db/init.js";

export interface FeeAllocationRow {
  id: number;
  person_id: number;
  notes: string | null;
  is_invoiced: boolean;
  is_paid: boolean;
  invoice_ref: string | null;
}

export interface LineItemRow {
  id: number;
  allocation_id: number;
  description: string | null;
  amount: number | null;
}

export interface FeeAllocationMutationInput {
  personId: number;
  notes?: string;
  isInvoiced: boolean;
  isPaid: boolean;
  invoiceRef?: string;
}

export async function createFeeAllocation(
  input: FeeAllocationMutationInput
): Promise<FeeAllocationRow> {
  const rows = await run_query<FeeAllocationRow>({
    text: `
      INSERT INTO fee_allocations (person_id, notes, is_invoiced, is_paid, invoice_ref)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, person_id, notes, is_invoiced, is_paid, invoice_ref;
    `,
    values: [
      input.personId,
      input.notes ?? null,
      input.isInvoiced,
      input.isPaid,
      input.invoiceRef ?? null,
    ],
  });
  return rows[0];
}

export async function readFeeAllocationById(id: number): Promise<FeeAllocationRow | null> {
  const rows = await run_query<FeeAllocationRow>({
    text: `
      SELECT id, person_id, notes, is_invoiced, is_paid, invoice_ref
      FROM fee_allocations WHERE id = $1 LIMIT 1;
    `,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateFeeAllocation(
  id: number,
  input: FeeAllocationMutationInput
): Promise<FeeAllocationRow | null> {
  const rows = await run_query<FeeAllocationRow>({
    text: `
      UPDATE fee_allocations
      SET person_id = $1, notes = $2, is_invoiced = $3, is_paid = $4, invoice_ref = $5
      WHERE id = $6
      RETURNING id, person_id, notes, is_invoiced, is_paid, invoice_ref;
    `,
    values: [
      input.personId,
      input.notes ?? null,
      input.isInvoiced,
      input.isPaid,
      input.invoiceRef ?? null,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function deleteFeeAllocation(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM fee_allocations WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

export async function readLineItemsByAllocationId(allocationId: number): Promise<LineItemRow[]> {
  return run_query<LineItemRow>({
    text: `
      SELECT id, allocation_id, description, amount
      FROM fee_allocation_line_items
      WHERE allocation_id = $1
      ORDER BY id;
    `,
    values: [allocationId],
  });
}

export async function createLineItem(
  allocationId: number,
  description: string | null,
  amount: number | null
): Promise<LineItemRow> {
  const rows = await run_query<LineItemRow>({
    text: `
      INSERT INTO fee_allocation_line_items (allocation_id, description, amount)
      VALUES ($1, $2, $3)
      RETURNING id, allocation_id, description, amount;
    `,
    values: [allocationId, description, amount],
  });
  return rows[0];
}

export async function deleteLineItem(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM fee_allocation_line_items WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
