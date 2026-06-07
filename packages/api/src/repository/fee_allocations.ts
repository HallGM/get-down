import { run_query } from "../db/init.js";
import { groupById } from "../utils/groupById.js";

export interface FeeAllocationRow {
  id: number;
  person_id: number | null;
  gig_id: number | null;
  notes: string | null;
  is_invoiced: boolean;
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
  invoiceRef?: string;
}

const SELECT_COLS = `id, person_id, gig_id, notes, is_invoiced, invoice_ref`;
const LINE_ITEM_COLS = `id, allocation_id, description, amount`;

export async function createFeeAllocation(
  input: FeeAllocationMutationInput
): Promise<FeeAllocationRow> {
  const rows = await run_query<FeeAllocationRow>({
    text: `
      INSERT INTO fee_allocations (person_id, gig_id, notes, is_invoiced, invoice_ref)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.personId ?? null,
      input.gigId ?? null,
      input.notes ?? null,
      input.isInvoiced,
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

export async function readFeeAllocationsByShowcaseId(showcaseId: number): Promise<FeeAllocationRow[]> {
  return run_query<FeeAllocationRow>({
    text: `
      SELECT DISTINCT fa.id, fa.person_id, fa.gig_id, fa.notes, fa.is_invoiced, fa.invoice_ref
      FROM fee_allocations fa
      JOIN assigned_roles ar ON ar.fee_allocation_id = fa.id
      WHERE ar.showcase_id = $1
      ORDER BY fa.id;
    `,
    values: [showcaseId],
  });
}

export async function updateFeeAllocation(
  id: number,
  input: FeeAllocationMutationInput
): Promise<FeeAllocationRow | null> {
  const rows = await run_query<FeeAllocationRow>({
    text: `
      UPDATE fee_allocations
      SET person_id = $1, gig_id = $2, notes = $3, is_invoiced = $4, invoice_ref = $5
      WHERE id = $6
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.personId ?? null,
      input.gigId ?? null,
      input.notes ?? null,
      input.isInvoiced,
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

// ─── Expense links (fee_allocations_expenses) ─────────────────────────────────

export async function readExpenseIdsByAllocationId(allocationId: number): Promise<number[]> {
  const rows = await run_query<{ expense_id: number }>({
    text: `SELECT expense_id FROM fee_allocations_expenses WHERE allocation_id = $1 ORDER BY expense_id;`,
    values: [allocationId],
  });
  return rows.map((r) => r.expense_id);
}

export async function readExpenseIdsByAllocationIds(
  allocationIds: number[]
): Promise<Map<number, number[]>> {
  if (allocationIds.length === 0) return new Map();
  const rows = await run_query<{ allocation_id: number; expense_id: number }>({
    text: `
      SELECT allocation_id, expense_id
      FROM fee_allocations_expenses
      WHERE allocation_id = ANY($1::int[])
      ORDER BY allocation_id, expense_id;
    `,
    values: [allocationIds],
  });
  return groupById(rows, (r) => r.allocation_id, (r) => r.expense_id);
}

export async function linkExpenseToAllocation(
  allocationId: number,
  expenseId: number
): Promise<void> {
  await run_query({
    text: `
      INSERT INTO fee_allocations_expenses (allocation_id, expense_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `,
    values: [allocationId, expenseId],
  });
}

export async function unlinkExpenseFromAllocation(
  allocationId: number,
  expenseId: number
): Promise<void> {
  await run_query({
    text: `DELETE FROM fee_allocations_expenses WHERE allocation_id = $1 AND expense_id = $2;`,
    values: [allocationId, expenseId],
  });
}

// ─── Transaction links (account_transactions_fee_allocations) ─────────────────

export async function readTransactionIdsByAllocationId(allocationId: number): Promise<number[]> {
  const rows = await run_query<{ transaction_id: number }>({
    text: `SELECT transaction_id FROM account_transactions_fee_allocations WHERE allocation_id = $1 ORDER BY transaction_id;`,
    values: [allocationId],
  });
  return rows.map((r) => r.transaction_id);
}

export async function readTransactionIdsByAllocationIds(
  allocationIds: number[]
): Promise<Map<number, number[]>> {
  if (allocationIds.length === 0) return new Map();
  const rows = await run_query<{ allocation_id: number; transaction_id: number }>({
    text: `
      SELECT allocation_id, transaction_id
      FROM account_transactions_fee_allocations
      WHERE allocation_id = ANY($1::int[])
      ORDER BY allocation_id, transaction_id;
    `,
    values: [allocationIds],
  });
  return groupById(rows, (r) => r.allocation_id, (r) => r.transaction_id);
}

export async function linkTransactionToAllocation(
  allocationId: number,
  transactionId: number
): Promise<void> {
  await run_query({
    text: `
      INSERT INTO account_transactions_fee_allocations (transaction_id, allocation_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `,
    values: [transactionId, allocationId],
  });
}

export async function unlinkTransactionFromAllocation(
  allocationId: number,
  transactionId: number
): Promise<void> {
  await run_query({
    text: `DELETE FROM account_transactions_fee_allocations WHERE allocation_id = $1 AND transaction_id = $2;`,
    values: [allocationId, transactionId],
  });
}
