import type {
  FeeAllocation,
  FeeAllocationLineItem,
  Expense,
  CreateFeeAllocationRequest,
  UpdateFeeAllocationRequest,
  UpdateFeeAllocationLineItemRequest,
  CreateFeeAllocationLineItemRequest,
} from "@get-down/shared";
import * as feeAllocationsRepo from "../repository/fee_allocations.js";
import * as expensesRepo from "../repository/expenses.js";
import { mapExpense } from "./expenses.js";
import * as assignedRolesRepo from "../repository/assigned_roles.js";
import * as rolesRepo from "../repository/roles.js";
import * as gigsRepo from "../repository/gigs.js";
import * as peopleRepo from "../repository/people.js";
import * as accountsRepo from "../repository/accounts.js";
import { withTransaction } from "../db/init.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";
import { buildPersonName } from "../utils/people.js";
import { z } from "zod";

export async function getAllFeeAllocations(): Promise<FeeAllocation[]> {
  const rows = await feeAllocationsRepo.readAllFeeAllocations();
  const ids = rows.map((r) => r.id);
  const [expenseMap, txMap] = await Promise.all([
    feeAllocationsRepo.readExpenseIdsByAllocationIds(ids),
    feeAllocationsRepo.readTransactionIdsByAllocationIds(ids),
  ]);
  return rows.map((row) => mapAllocation(row, expenseMap.get(row.id) ?? [], txMap.get(row.id) ?? []));
}

export async function getFeeAllocationById(id: number): Promise<FeeAllocation> {
  const row = await feeAllocationsRepo.readFeeAllocationById(id);
  if (!row) throw new NotFoundError("FeeAllocation not found");
  const [lineItemRows, expenseIds, transactionIds] = await Promise.all([
    feeAllocationsRepo.readLineItemsByAllocationId(id),
    feeAllocationsRepo.readExpenseIdsByAllocationId(id),
    feeAllocationsRepo.readTransactionIdsByAllocationId(id),
  ]);
  const allocation = mapAllocation(row, expenseIds, transactionIds);
  allocation.lineItems = lineItemRows.map(mapLineItem);
  return allocation;
}

export async function getFeeAllocationsByGig(gigId: number): Promise<FeeAllocation[]> {
  const rows = await feeAllocationsRepo.readFeeAllocationsByGigId(gigId);
  return assembleFeeAllocations(rows);
}

export async function createFeeAllocation(
  input: CreateFeeAllocationRequest
): Promise<FeeAllocation> {
  const row = await feeAllocationsRepo.createFeeAllocation({
    personId: input.personId,
    gigId: input.gigId,
    notes: input.notes?.trim(),
    isInvoiced: input.isInvoiced ?? false,
    isPaid: input.isPaid ?? false,
    invoiceRef: input.invoiceRef?.trim(),
  });
  const allocation = mapAllocation(row, [], []);
  allocation.lineItems = [];
  return allocation;
}

export async function updateFeeAllocation(
  id: number,
  input: UpdateFeeAllocationRequest
): Promise<FeeAllocation> {
  const existing = await getFeeAllocationById(id);
  const row = await feeAllocationsRepo.updateFeeAllocation(id, {
    personId: input.personId ?? existing.personId,
    gigId: input.gigId ?? existing.gigId,
    notes: input.notes?.trim() ?? existing.notes,
    isInvoiced: input.isInvoiced ?? existing.isInvoiced,
    isPaid: input.isPaid ?? existing.isPaid,
    invoiceRef: input.invoiceRef?.trim() ?? existing.invoiceRef,
  });
  if (!row) throw new NotFoundError("FeeAllocation not found");
  const [lineItemRows, expenseIds, transactionIds] = await Promise.all([
    feeAllocationsRepo.readLineItemsByAllocationId(id),
    feeAllocationsRepo.readExpenseIdsByAllocationId(id),
    feeAllocationsRepo.readTransactionIdsByAllocationId(id),
  ]);
  const allocation = mapAllocation(row, expenseIds, transactionIds);
  allocation.lineItems = lineItemRows.map(mapLineItem);
  return allocation;
}

export async function deleteFeeAllocation(id: number): Promise<void> {
  const existing = await feeAllocationsRepo.readFeeAllocationById(id);
  if (!existing) throw new NotFoundError("FeeAllocation not found");

  await withTransaction(async () => {
    // Clear fee_allocation_id on any linked assigned roles before deleting
    const linkedRoles = await assignedRolesRepo.readAssignedRolesByFeeAllocationId(id);
    for (const ar of linkedRoles) {
      await setAllocationOnRole(ar, null);
    }
    await feeAllocationsRepo.deleteFeeAllocation(id);
  });
}

export async function addLineItem(
  allocationId: number,
  input: CreateFeeAllocationLineItemRequest
): Promise<FeeAllocationLineItem> {
  const allocation = await feeAllocationsRepo.readFeeAllocationById(allocationId);
  if (!allocation) throw new NotFoundError("FeeAllocation not found");
  const row = await feeAllocationsRepo.createLineItem(
    allocationId,
    input.description?.trim() ?? null,
    input.amount ?? null
  );
  return mapLineItem(row);
}

export async function updateLineItem(
  allocationId: number,
  lineItemId: number,
  input: UpdateFeeAllocationLineItemRequest
): Promise<FeeAllocationLineItem> {
  const allocation = await feeAllocationsRepo.readFeeAllocationById(allocationId);
  if (!allocation) throw new NotFoundError("FeeAllocation not found");
  const row = await feeAllocationsRepo.updateLineItem(
    lineItemId,
    allocationId,
    input.description?.trim() ?? null,
    input.amount ?? null
  );
  if (!row) throw new NotFoundError("LineItem not found");
  return mapLineItem(row);
}

export async function removeLineItem(allocationId: number, lineItemId: number): Promise<void> {
  const allocation = await feeAllocationsRepo.readFeeAllocationById(allocationId);
  if (!allocation) throw new NotFoundError("FeeAllocation not found");
  const deleted = await feeAllocationsRepo.deleteLineItem(lineItemId, allocationId);
  if (!deleted) throw new NotFoundError("LineItem not found");
}

/**
 * Generate fee allocations for all assigned roles on a gig.
 * Groups roles by person (unassigned slots each get their own allocation).
 * Returns { conflict: true } (HTTP 200) if allocations already exist and force is false.
 */
export async function generateFeeAllocationsForGig(
  gigId: number,
  force: boolean
): Promise<{ conflict: true } | FeeAllocation[]> {
  // Check for existing allocations
  const existing = await feeAllocationsRepo.readFeeAllocationsByGigId(gigId);
  if (existing.length > 0 && !force) {
    return { conflict: true };
  }

  const assignedRoles = await assignedRolesRepo.readAssignedRolesByGigId(gigId);

  return withTransaction(async () => {
    if (existing.length > 0) {
      // Null out fee_allocation_id on assigned_roles first, then delete
      for (const ar of assignedRoles) {
        if (ar.fee_allocation_id !== null) {
          await setAllocationOnRole(ar, null);
        }
      }
      await feeAllocationsRepo.deleteFeeAllocationsByGigId(gigId);
    }

    const { personGroups, unassignedSlots } = groupRolesByPerson(assignedRoles);
    const results: FeeAllocation[] = [];

    // Create one allocation per person
    for (const [personId, roles] of personGroups) {
      const allocationRow = await feeAllocationsRepo.createFeeAllocation({
        personId,
        gigId,
        isInvoiced: false,
        isPaid: false,
      });

      const lineItems = await populateAllocationLineItems(allocationRow.id, roles);

      // Link assigned_roles to this allocation
      for (const ar of roles) {
        await setAllocationOnRole(ar, allocationRow.id);
      }

      const allocation = mapAllocation(allocationRow, [], []);
      allocation.lineItems = lineItems;
      results.push(allocation);
    }

    // Create one allocation per unassigned slot
    for (const ar of unassignedSlots) {
      const allocationRow = await feeAllocationsRepo.createFeeAllocation({
        gigId,
        isInvoiced: false,
        isPaid: false,
      });

      const lineItems = await populateAllocationLineItems(allocationRow.id, [ar]);

      await setAllocationOnRole(ar, allocationRow.id);

      const allocation = mapAllocation(allocationRow, [], []);
      allocation.lineItems = lineItems;
      results.push(allocation);
    }

    return results;
  });
}

export async function getFeeAllocationsByShowcase(showcaseId: number): Promise<FeeAllocation[]> {
  const rows = await feeAllocationsRepo.readFeeAllocationsByShowcaseId(showcaseId);
  return assembleFeeAllocations(rows);
}

const GenerateFeeAllocationsSchema = z.object({
  force: z.boolean().optional().default(false),
});

/**
 * Generate fee allocations for all assigned roles on a showcase.
 * Groups roles by person (unassigned slots each get their own allocation).
 * Returns { conflict: true } (HTTP 200) if allocations already exist and force is false.
 * Does NOT auto-populate line items from role fees.
 */
export async function generateFeeAllocationsForShowcase(
  showcaseId: number,
  body: unknown
): Promise<{ conflict: true } | FeeAllocation[]> {
  const { force } = parseOrBadRequest(GenerateFeeAllocationsSchema, body);
  const existing = await feeAllocationsRepo.readFeeAllocationsByShowcaseId(showcaseId);
  if (existing.length > 0 && !force) {
    return { conflict: true };
  }

  const assignedRoles = await assignedRolesRepo.readAssignedRolesByShowcaseId(showcaseId);

  return withTransaction(async () => {
    if (existing.length > 0) {
      for (const ar of assignedRoles) {
        if (ar.fee_allocation_id !== null) {
          await setAllocationOnRole(ar, null);
        }
      }
      for (const fa of existing) {
        await feeAllocationsRepo.deleteFeeAllocation(fa.id);
      }
    }

    const { personGroups, unassignedSlots } = groupRolesByPerson(assignedRoles);

    const results: FeeAllocation[] = [];

    for (const [personId, roles] of personGroups) {
      const allocationRow = await feeAllocationsRepo.createFeeAllocation({
        personId,
        isInvoiced: false,
        isPaid: false,
      });
      for (const ar of roles) {
        await setAllocationOnRole(ar, allocationRow.id);
      }
      const allocation = mapAllocation(allocationRow, [], []);
      allocation.lineItems = [];
      results.push(allocation);
    }

    for (const ar of unassignedSlots) {
      const allocationRow = await feeAllocationsRepo.createFeeAllocation({
        isInvoiced: false,
        isPaid: false,
      });
      await setAllocationOnRole(ar, allocationRow.id);
      const allocation = mapAllocation(allocationRow, [], []);
      allocation.lineItems = [];
      results.push(allocation);
    }

    return results;
  });
}

/**
 * Reset a single fee allocation: delete all line items and recreate defaults
 * from the role fees for assigned roles pointing to this allocation.
 */
export async function resetFeeAllocation(id: number): Promise<FeeAllocation> {
  const allocationRow = await feeAllocationsRepo.readFeeAllocationById(id);
  if (!allocationRow) throw new NotFoundError("FeeAllocation not found");

  return withTransaction(async () => {
    await feeAllocationsRepo.deleteLineItemsByAllocationId(id);

    // Find assigned_roles linked to this allocation and recreate line items from role fees
    const gigId = allocationRow.gig_id;
    let lineItems: FeeAllocationLineItem[] = [];

    if (gigId !== null) {
      const allRoles = await assignedRolesRepo.readAssignedRolesByGigId(gigId);
      const linked = allRoles.filter((ar) => ar.fee_allocation_id === id);
      lineItems = await populateAllocationLineItems(id, linked);
    }

    const [expenseIds, transactionIds] = await Promise.all([
      feeAllocationsRepo.readExpenseIdsByAllocationId(id),
      feeAllocationsRepo.readTransactionIdsByAllocationId(id),
    ]);
    const allocation = mapAllocation(allocationRow, expenseIds, transactionIds);
    allocation.lineItems = lineItems;
    return allocation;
  });
}

// ─── Expense link management ──────────────────────────────────────────────────

export async function getAllocationsByExpense(expenseId: number): Promise<FeeAllocation[]> {
  const row = await expensesRepo.readExpenseById(expenseId);
  if (!row) throw new NotFoundError("Expense not found");
  const allocationIds = await expensesRepo.readAllocationIdsByExpenseId(expenseId);
  if (allocationIds.length === 0) return [];

  const rows = await Promise.all(
    allocationIds.map((id) => feeAllocationsRepo.readFeeAllocationById(id))
  );
  const validRows = rows.filter((r): r is NonNullable<typeof r> => r !== null);

  const [expenseMap, txMap, lineItemRows] = await Promise.all([
    feeAllocationsRepo.readExpenseIdsByAllocationIds(allocationIds),
    feeAllocationsRepo.readTransactionIdsByAllocationIds(allocationIds),
    feeAllocationsRepo.readLineItemsByAllocationIds(allocationIds),
  ]);

  const liByAllocation = new Map<number, typeof lineItemRows>();
  for (const li of lineItemRows) {
    const arr = liByAllocation.get(li.allocation_id) ?? [];
    arr.push(li);
    liByAllocation.set(li.allocation_id, arr);
  }

  return validRows.map((r) => {
    const allocation = mapAllocation(r, expenseMap.get(r.id) ?? [], txMap.get(r.id) ?? []);
    allocation.lineItems = (liByAllocation.get(r.id) ?? []).map(mapLineItem);
    return allocation;
  });
}

/**
 * Auto-generate an expense from a fee allocation's line items and link it.
 * Description is built from gig name and person name (+ optional allocation notes).
 */
export async function generateExpenseForAllocation(allocationId: number): Promise<Expense> {
  const allocationRow = await feeAllocationsRepo.readFeeAllocationById(allocationId);
  if (!allocationRow) throw new NotFoundError("FeeAllocation not found");
  if (!allocationRow.gig_id) throw new BadRequestError("Allocation has no gig. Cannot generate expense.");

  const [gig, lineItems] = await Promise.all([
    gigsRepo.readGigById(allocationRow.gig_id),
    feeAllocationsRepo.readLineItemsByAllocationId(allocationId),
  ]);
  if (!gig) throw new NotFoundError("Gig not found");

  const person = allocationRow.person_id
    ? await peopleRepo.readPersonById(allocationRow.person_id)
    : null;

  const amount = lineItems.reduce((sum, li) => sum + (li.amount ?? 0), 0);

  const gigLabel = `${gig.first_name} ${gig.last_name}`;
  const personLabel = person ? buildPersonName(person) : null;

  let description = gigLabel;
  if (personLabel) description += ` — ${personLabel}`;
  if (allocationRow.notes) description += ` (${allocationRow.notes})`;

  return withTransaction(async () => {
    const expenseRow = await expensesRepo.createExpense({
      amount,
      description,
      date: undefined,
      category: undefined,
      recipientName: undefined,
    });
    await feeAllocationsRepo.linkExpenseToAllocation(allocationId, expenseRow.id);
    return mapExpense(expenseRow, [allocationId], [], 0);
  });
}

const LinkExpenseSchema = z.object({ expenseId: z.number().int() });
const LinkTransactionSchema = z.object({ transactionId: z.number().int() });

export async function linkExpenseToAllocation(
  allocationId: number,
  body: unknown
): Promise<void> {
  const { expenseId } = parseOrBadRequest(LinkExpenseSchema, body);
  const [allocation, expense] = await Promise.all([
    feeAllocationsRepo.readFeeAllocationById(allocationId),
    expensesRepo.readExpenseById(expenseId),
  ]);
  if (!allocation) throw new NotFoundError("FeeAllocation not found");
  if (!expense) throw new NotFoundError("Expense not found");
  await feeAllocationsRepo.linkExpenseToAllocation(allocationId, expenseId);
}

export async function unlinkExpenseFromAllocation(
  allocationId: number,
  expenseId: number
): Promise<void> {
  const allocation = await feeAllocationsRepo.readFeeAllocationById(allocationId);
  if (!allocation) throw new NotFoundError("FeeAllocation not found");
  await feeAllocationsRepo.unlinkExpenseFromAllocation(allocationId, expenseId);
}

// ─── Transaction link management ─────────────────────────────────────────────

export async function linkTransactionToAllocation(
  allocationId: number,
  body: unknown
): Promise<void> {
  const { transactionId } = parseOrBadRequest(LinkTransactionSchema, body);
  const [allocation, transaction] = await Promise.all([
    feeAllocationsRepo.readFeeAllocationById(allocationId),
    accountsRepo.readTransactionById(transactionId),
  ]);
  if (!allocation) throw new NotFoundError("FeeAllocation not found");
  if (!transaction) throw new NotFoundError("Transaction not found");
  await feeAllocationsRepo.linkTransactionToAllocation(allocationId, transactionId);
}

export async function unlinkTransactionFromAllocation(
  allocationId: number,
  transactionId: number
): Promise<void> {
  const allocation = await feeAllocationsRepo.readFeeAllocationById(allocationId);
  if (!allocation) throw new NotFoundError("FeeAllocation not found");
  await feeAllocationsRepo.unlinkTransactionFromAllocation(allocationId, transactionId);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

type AssignedRoleRow = Awaited<ReturnType<typeof assignedRolesRepo.readAssignedRolesByGigId>>[number];

async function assembleFeeAllocations(
  rows: feeAllocationsRepo.FeeAllocationRow[]
): Promise<FeeAllocation[]> {
  const ids = rows.map((r) => r.id);
  const [allLineItems, expenseMap, txMap] = await Promise.all([
    feeAllocationsRepo.readLineItemsByAllocationIds(ids),
    feeAllocationsRepo.readExpenseIdsByAllocationIds(ids),
    feeAllocationsRepo.readTransactionIdsByAllocationIds(ids),
  ]);
  const byAllocation = new Map<number, typeof allLineItems>();
  for (const li of allLineItems) {
    const arr = byAllocation.get(li.allocation_id) ?? [];
    arr.push(li);
    byAllocation.set(li.allocation_id, arr);
  }
  return rows.map((row) => {
    const allocation = mapAllocation(row, expenseMap.get(row.id) ?? [], txMap.get(row.id) ?? []);
    allocation.lineItems = (byAllocation.get(row.id) ?? []).map(mapLineItem);
    return allocation;
  });
}

function groupRolesByPerson(assignedRoles: AssignedRoleRow[]): {
  personGroups: Map<number, AssignedRoleRow[]>;
  unassignedSlots: AssignedRoleRow[];
} {
  const personGroups = new Map<number, AssignedRoleRow[]>();
  const unassignedSlots: AssignedRoleRow[] = [];
  for (const ar of assignedRoles) {
    if (ar.person_id !== null) {
      if (!personGroups.has(ar.person_id)) personGroups.set(ar.person_id, []);
      personGroups.get(ar.person_id)!.push(ar);
    } else {
      unassignedSlots.push(ar);
    }
  }
  return { personGroups, unassignedSlots };
}

async function setAllocationOnRole(ar: AssignedRoleRow, feeAllocationId: number | null): Promise<void> {
  await assignedRolesRepo.updateAssignedRole(ar.id, {
    gigId: ar.gig_id ?? undefined,
    showcaseId: ar.showcase_id ?? undefined,
    personId: ar.person_id ?? undefined,
    roleName: ar.role_name,
    feeAllocationId,
  });
}

function mapAllocation(
  row: feeAllocationsRepo.FeeAllocationRow,
  expenseIds: number[],
  transactionIds: number[]
): FeeAllocation {
  return {
    id: row.id,
    personId: row.person_id ?? undefined,
    gigId: row.gig_id ?? undefined,
    notes: row.notes ?? undefined,
    isInvoiced: row.is_invoiced,
    isPaid: row.is_paid,
    invoiceRef: row.invoice_ref ?? undefined,
    expenseIds,
    transactionIds,
  };
}

function mapLineItem(row: feeAllocationsRepo.LineItemRow): FeeAllocationLineItem {
  return {
    id: row.id,
    allocationId: row.allocation_id,
    description: row.description ?? undefined,
    amount: row.amount ?? undefined,
  };
}

async function populateAllocationLineItems(
  allocationId: number,
  roles: Array<{ role_name: string }>
): Promise<FeeAllocationLineItem[]> {
  const names = roles.map((r) => r.role_name);
  const roleRows = await rolesRepo.readRolesByNames(names);
  const feeByName = new Map(roleRows.map((r) => [r.name, r.fee]));

  const lineItems: FeeAllocationLineItem[] = [];
  for (const ar of roles) {
    const fee = feeByName.get(ar.role_name);
    if (fee != null) {
      const li = await feeAllocationsRepo.createLineItem(allocationId, ar.role_name, fee);
      lineItems.push(mapLineItem(li));
    }
  }
  return lineItems;
}
