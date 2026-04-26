import { run_query } from "../db/init.js";

export interface FeeAllocationRow {
  id: number;
  person_id: number | null;
  gig_id: number | null;
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
  personId?: number;
  gigId?: number;
  notes?: string;
  isInvoiced: boolean;
  isPaid: boolean;
  invoiceRef?: string;
}

const SELECT_COLS = `id, person_id, gig_id, notes, is_invoiced, is_paid, invoice_ref`;
const LINE_ITEM_COLS = `id, allocation_id, description, amount`;

export async function createFeeAllocation(
  input: FeeAllocationMutationInput
): Promise<FeeAllocationRow> {
  const rows = await run_query<FeeAllocationRow>({
    text: `
      INSERT INTO fee_allocations (person_id, gig_id, notes, is_invoiced, is_paid, invoice_ref)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.personId ?? null,
      input.gigId ?? null,
      input.notes ?? null,
      input.isInvoiced,
      input.isPaid,
      input.invoiceRef ?? null,
    ],
  });
  return rows[0];
}

export async function readAllFeeAllocations(): Promise<FeeAllocationRow[]> {
  return run_query<FeeAllocationRow>({
    text: `SELECT ${SELECT_COLS} FROM fee_allocations ORDER BY id DESC;`,
  });
}

export async function readFeeAllocationById(id: number): Promise<FeeAllocationRow | null> {
  const rows = await run_query<FeeAllocationRow>({
    text: `SELECT ${SELECT_COLS} FROM fee_allocations WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function readFeeAllocationsByGigId(gigId: number): Promise<FeeAllocationRow[]> {
  return run_query<FeeAllocationRow>({
    text: `SELECT ${SELECT_COLS} FROM fee_allocations WHERE gig_id = $1 ORDER BY id;`,
    values: [gigId],
  });
}

export async function updateFeeAllocation(
  id: number,
  input: FeeAllocationMutationInput
): Promise<FeeAllocationRow | null> {
  const rows = await run_query<FeeAllocationRow>({
    text: `
      UPDATE fee_allocations
      SET person_id = $1, gig_id = $2, notes = $3, is_invoiced = $4, is_paid = $5, invoice_ref = $6
      WHERE id = $7
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.personId ?? null,
      input.gigId ?? null,
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

export async function deleteFeeAllocationsByGigId(gigId: number): Promise<void> {
  await run_query({
    text: `DELETE FROM fee_allocations WHERE gig_id = $1;`,
    values: [gigId],
  });
}

export async function readLineItemsByAllocationId(allocationId: number): Promise<LineItemRow[]> {
  return run_query<LineItemRow>({
    text: `
      SELECT ${LINE_ITEM_COLS}
      FROM fee_allocation_line_items
      WHERE allocation_id = $1
      ORDER BY id;
    `,
    values: [allocationId],
  });
}

export async function readLineItemsByAllocationIds(allocationIds: number[]): Promise<LineItemRow[]> {
  if (allocationIds.length === 0) return [];
  return run_query<LineItemRow>({
    text: `
      SELECT ${LINE_ITEM_COLS}
      FROM fee_allocation_line_items
      WHERE allocation_id = ANY($1)
      ORDER BY allocation_id, id;
    `,
    values: [allocationIds],
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
      RETURNING ${LINE_ITEM_COLS};
    `,
    values: [allocationId, description, amount],
  });
  return rows[0];
}

export async function updateLineItem(
  id: number,
  allocationId: number,
  description: string | null,
  amount: number | null
): Promise<LineItemRow | null> {
  const rows = await run_query<LineItemRow>({
    text: `
      UPDATE fee_allocation_line_items
      SET description = $3, amount = $4
      WHERE id = $1 AND allocation_id = $2
      RETURNING ${LINE_ITEM_COLS};
    `,
    values: [id, allocationId, description, amount],
  });
  return rows[0] ?? null;
}

export async function deleteLineItem(id: number, allocationId: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM fee_allocation_line_items WHERE id = $1 AND allocation_id = $2 RETURNING id;`,
    values: [id, allocationId],
  });
  return rows.length > 0;
}

export async function deleteLineItemsByAllocationId(allocationId: number): Promise<void> {
  await run_query({
    text: `DELETE FROM fee_allocation_line_items WHERE allocation_id = $1;`,
    values: [allocationId],
  });
}
