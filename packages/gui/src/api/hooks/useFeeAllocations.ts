import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FeeAllocation } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "fee-allocations";

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

export function useCreateFeeAllocation() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: { personId: number; notes?: string }) =>
      apiFetch<FeeAllocation>("POST", "/fee-allocations", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Fee allocation deleted",
  });
}

export function useAddFeeLineItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ allocationId, input }: { allocationId: number; input: { description: string; amount: number } }) =>
      apiFetch("POST", `/fee-allocations/${allocationId}/line-items`, input),
    onSuccess: (_data, { allocationId }) =>
      qc.invalidateQueries({ queryKey: [KEY, allocationId] }),
    successMessage: "Line item added",
  });
}

export function useRemoveFeeLineItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ allocationId, lineItemId }: { allocationId: number; lineItemId: number }) =>
      apiFetch<void>("DELETE", `/fee-allocations/${allocationId}/line-items/${lineItemId}`),
    onSuccess: (_data, { allocationId }) =>
      qc.invalidateQueries({ queryKey: [KEY, allocationId] }),
    successMessage: "Line item removed",
  });
}
