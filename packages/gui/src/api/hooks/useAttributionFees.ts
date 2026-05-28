import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttributionFee, CreateAttributionFeeRequest, UpdateAttributionFeeRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "attribution-fees";

export function useAllAttributionFees() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<AttributionFee[]>("GET", "/attribution-fees"),
  });
}

export function useAttributionFees(attributionId: number) {
  return useQuery({
    queryKey: [KEY, "by-attribution", attributionId],
    queryFn: () => apiFetch<AttributionFee[]>("GET", `/attributions/${attributionId}/fees`),
    enabled: !!attributionId,
  });
}

export function useCreateAttributionFee(attributionId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateAttributionFeeRequest) =>
      apiFetch<AttributionFee>("POST", `/attributions/${attributionId}/fees`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "by-attribution", attributionId] }),
    successMessage: "Fee added",
  });
}

export function useUpdateAttributionFee(attributionId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ feeId, input }: { feeId: number; input: UpdateAttributionFeeRequest }) =>
      apiFetch<AttributionFee>("PUT", `/attributions/${attributionId}/fees/${feeId}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "by-attribution", attributionId] }),
    successMessage: "Fee saved",
  });
}

export function useDeleteAttributionFee(attributionId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (feeId: number) => apiFetch<void>("DELETE", `/attributions/${attributionId}/fees/${feeId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "by-attribution", attributionId] }),
    successMessage: "Fee deleted",
  });
}

export function useLinkExpenseToAttributionFee(attributionId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ feeId, expenseId }: { feeId: number; expenseId: number }) =>
      apiFetch<void>("POST", `/attributions/${attributionId}/fees/${feeId}/expenses/${expenseId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "by-attribution", attributionId] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    successMessage: "Expense linked",
  });
}

export function useUnlinkExpenseFromAttributionFee(attributionId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ feeId, expenseId }: { feeId: number; expenseId: number }) =>
      apiFetch<void>("DELETE", `/attributions/${attributionId}/fees/${feeId}/expenses/${expenseId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "by-attribution", attributionId] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    successMessage: "Expense unlinked",
  });
}
