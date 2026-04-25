import type {
  FeeAllocation,
  FeeAllocationLineItem,
  CreateFeeAllocationRequest,
  UpdateFeeAllocationRequest,
  CreateFeeAllocationLineItemRequest,
} from "@get-down/shared";
import * as feeAllocationsRepo from "../repository/fee_allocations.js";
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

export async function createFeeAllocation(
  input: CreateFeeAllocationRequest
): Promise<FeeAllocation> {
  const row = await feeAllocationsRepo.createFeeAllocation(buildMutationInput(input));
  const allocation = mapAllocation(row);
  allocation.lineItems = [];
  return allocation;
}

export async function updateFeeAllocation(
  id: number,
  input: UpdateFeeAllocationRequest
): Promise<FeeAllocation> {
  const existing = await getFeeAllocationById(id);
  const row = await feeAllocationsRepo.updateFeeAllocation(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("FeeAllocation not found");
  const allocation = mapAllocation(row);
  const lineItemRows = await feeAllocationsRepo.readLineItemsByAllocationId(id);
  allocation.lineItems = lineItemRows.map(mapLineItem);
  return allocation;
}

export async function deleteFeeAllocation(id: number): Promise<void> {
  const deleted = await feeAllocationsRepo.deleteFeeAllocation(id);
  if (!deleted) throw new NotFoundError("FeeAllocation not found");
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

export async function removeLineItem(allocationId: number, lineItemId: number): Promise<void> {
  const allocation = await feeAllocationsRepo.readFeeAllocationById(allocationId);
  if (!allocation) throw new NotFoundError("FeeAllocation not found");
  const deleted = await feeAllocationsRepo.deleteLineItem(lineItemId);
  if (!deleted) throw new NotFoundError("LineItem not found");
}

function mapAllocation(row: feeAllocationsRepo.FeeAllocationRow): FeeAllocation {
  return {
    id: row.id,
    personId: row.person_id,
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

function buildMutationInput(
  input: CreateFeeAllocationRequest | UpdateFeeAllocationRequest,
  existing?: FeeAllocation
): feeAllocationsRepo.FeeAllocationMutationInput {
  const personId = input.personId ?? existing?.personId;
  if (!personId) throw new BadRequestError("personId is required");

  return {
    personId,
    notes: input.notes?.trim() ?? existing?.notes,
    isInvoiced: input.isInvoiced ?? existing?.isInvoiced ?? false,
    isPaid: input.isPaid ?? existing?.isPaid ?? false,
    invoiceRef: input.invoiceRef?.trim() ?? existing?.invoiceRef,
  };
}
