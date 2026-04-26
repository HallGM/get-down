import type {
  FeeAllocation,
  FeeAllocationLineItem,
  CreateFeeAllocationRequest,
  UpdateFeeAllocationRequest,
  UpdateFeeAllocationLineItemRequest,
  CreateFeeAllocationLineItemRequest,
} from "@get-down/shared";
import * as feeAllocationsRepo from "../repository/fee_allocations.js";
import * as assignedRolesRepo from "../repository/assigned_roles.js";
import * as rolesRepo from "../repository/roles.js";
import { withTransaction } from "../db/init.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getAllFeeAllocations(): Promise<FeeAllocation[]> {
  const rows = await feeAllocationsRepo.readAllFeeAllocations();
  return rows.map(mapAllocation);
}

export async function getFeeAllocationById(id: number): Promise<FeeAllocation> {
  const row = await feeAllocationsRepo.readFeeAllocationById(id);
  if (!row) throw new NotFoundError("FeeAllocation not found");
  const allocation = mapAllocation(row);
  const lineItemRows = await feeAllocationsRepo.readLineItemsByAllocationId(id);
  allocation.lineItems = lineItemRows.map(mapLineItem);
  return allocation;
}

export async function getFeeAllocationsByGig(gigId: number): Promise<FeeAllocation[]> {
  const rows = await feeAllocationsRepo.readFeeAllocationsByGigId(gigId);
  const ids = rows.map((r) => r.id);
  const allLineItems = await feeAllocationsRepo.readLineItemsByAllocationIds(ids);
  const byAllocation = new Map<number, typeof allLineItems>();
  for (const li of allLineItems) {
    const arr = byAllocation.get(li.allocation_id) ?? [];
    arr.push(li);
    byAllocation.set(li.allocation_id, arr);
  }
  return rows.map((row) => {
    const allocation = mapAllocation(row);
    allocation.lineItems = (byAllocation.get(row.id) ?? []).map(mapLineItem);
    return allocation;
  });
}

export async function createFeeAllocation(
  input: CreateFeeAllocationRequest
): Promise<FeeAllocation> {
  if (!input.personId && !input.gigId) throw new BadRequestError("personId or gigId is required");
  const row = await feeAllocationsRepo.createFeeAllocation({
    personId: input.personId,
    gigId: input.gigId,
    notes: input.notes?.trim(),
    isInvoiced: input.isInvoiced ?? false,
    isPaid: input.isPaid ?? false,
    invoiceRef: input.invoiceRef?.trim(),
  });
  const allocation = mapAllocation(row);
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
  const allocation = mapAllocation(row);
  const lineItemRows = await feeAllocationsRepo.readLineItemsByAllocationId(id);
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

    // Group: assigned roles by personId (null = individual slot)
    const personGroups = new Map<number, typeof assignedRoles>();
    const unassignedSlots: typeof assignedRoles = [];

    for (const ar of assignedRoles) {
      if (ar.person_id !== null) {
        if (!personGroups.has(ar.person_id)) {
          personGroups.set(ar.person_id, []);
        }
        personGroups.get(ar.person_id)!.push(ar);
      } else {
        unassignedSlots.push(ar);
      }
    }

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

      const allocation = mapAllocation(allocationRow);
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

      const allocation = mapAllocation(allocationRow);
      allocation.lineItems = lineItems;
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

    const allocation = mapAllocation(allocationRow);
    allocation.lineItems = lineItems;
    return allocation;
  });
}

// ─── Private helpers ──────────────────────────────────────────────────────────

type AssignedRoleRow = Awaited<ReturnType<typeof assignedRolesRepo.readAssignedRolesByGigId>>[number];

async function setAllocationOnRole(ar: AssignedRoleRow, feeAllocationId: number | null): Promise<void> {
  await assignedRolesRepo.updateAssignedRole(ar.id, {
    gigId: ar.gig_id ?? undefined,
    showcaseId: ar.showcase_id ?? undefined,
    personId: ar.person_id ?? undefined,
    roleName: ar.role_name,
    feeAllocationId,
  });
}

function mapAllocation(row: feeAllocationsRepo.FeeAllocationRow): FeeAllocation {
  return {
    id: row.id,
    personId: row.person_id ?? undefined,
    gigId: row.gig_id ?? undefined,
    notes: row.notes ?? undefined,
    isInvoiced: row.is_invoiced,
    isPaid: row.is_paid,
    invoiceRef: row.invoice_ref ?? undefined,
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
