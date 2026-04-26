import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { FeeAllocation, FeeAllocationLineItem, UpdateFeeAllocationLineItemRequest, CreateFeeAllocationLineItemRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "fee-allocations";
const GIG_KEY = "gig-fee-allocations";

function invalidateLineItemCaches(qc: QueryClient, allocationId: number) {
  qc.invalidateQueries({ queryKey: [KEY, allocationId] });
  qc.invalidateQueries({ queryKey: [GIG_KEY] });
}

export function useFeeAllocations() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<FeeAllocation[]>("GET", "/fee-allocations"),
  });
}

export function useFeeAllocation(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<FeeAllocation>("GET", `/fee-allocations/${id}`),
    enabled: !!id,
  });
}

export function useFeeAllocationsByGig(gigId: number) {
  return useQuery({
    queryKey: [GIG_KEY, gigId],
    queryFn: () => apiFetch<FeeAllocation[]>("GET", `/gigs/${gigId}/fee-allocations`),
    enabled: !!gigId,
  });
}

export function useCreateFeeAllocation() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: { personId: number; notes?: string }) =>
      apiFetch<FeeAllocation>("POST", "/fee-allocations", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Fee allocation created",
  });
}

export function useCreateFeeAllocationForGig(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: { personId?: number; notes?: string }) =>
      apiFetch<FeeAllocation>("POST", "/fee-allocations", { gigId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [GIG_KEY, gigId] }),
    successMessage: "Fee allocation created",
  });
}

export function useUpdateFeeAllocation() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: { notes?: string; isInvoiced?: boolean; isPaid?: boolean; invoiceRef?: string };
    }) => apiFetch<FeeAllocation>("PUT", `/fee-allocations/${id}`, input),
    onSuccess: (_data, { id }) =>
      qc.invalidateQueries({ queryKey: [KEY, id] }),
    successMessage: "Fee allocation updated",
  });
}

export function useDeleteFeeAllocation() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/fee-allocations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [GIG_KEY] });
    },
    successMessage: "Fee allocation deleted",
  });
}

export function useGenerateFeeAllocations(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (force: boolean) =>
      apiFetch<{ conflict: true } | FeeAllocation[]>("POST", `/gigs/${gigId}/fee-allocations/generate`, { force }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GIG_KEY, gigId] });
      qc.invalidateQueries({ queryKey: ["roles", "gig", gigId] });
    },
    successMessage: "Fee allocations generated",
  });
}

export function useResetFeeAllocation() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) =>
      apiFetch<FeeAllocation>("POST", `/fee-allocations/${id}/reset`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: [KEY, id] });
      qc.invalidateQueries({ queryKey: [GIG_KEY] });
    },
    successMessage: "Fee allocation reset",
  });
}

export function useAddFeeLineItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ allocationId, input }: { allocationId: number; input: CreateFeeAllocationLineItemRequest }) =>
      apiFetch<FeeAllocationLineItem>("POST", `/fee-allocations/${allocationId}/line-items`, input),
    onSuccess: (_data, { allocationId }) => invalidateLineItemCaches(qc, allocationId),
    successMessage: "Line item added",
  });
}

export function useUpdateFeeLineItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ allocationId, lineItemId, input }: { allocationId: number; lineItemId: number; input: UpdateFeeAllocationLineItemRequest }) =>
      apiFetch<FeeAllocationLineItem>("PUT", `/fee-allocations/${allocationId}/line-items/${lineItemId}`, input),
    onSuccess: (_data, { allocationId }) => invalidateLineItemCaches(qc, allocationId),
    successMessage: "Line item updated",
  });
}

export function useRemoveFeeLineItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ allocationId, lineItemId }: { allocationId: number; lineItemId: number }) =>
      apiFetch<void>("DELETE", `/fee-allocations/${allocationId}/line-items/${lineItemId}`),
    onSuccess: (_data, { allocationId }) => invalidateLineItemCaches(qc, allocationId),
    successMessage: "Line item removed",
  });
}
