import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Refund, CreateRefundRequest, UpdateRefundRequest } from "@get-down/shared";
import { apiFetch, apiFetchBlob } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";
import { ALL_GIG_PAYMENTS_KEY } from "./usePayments.js";

const KEY = "refunds";
const INVOICES_KEY = "invoices";

export function useGigRefunds(gigId: number) {
  return useQuery({
    queryKey: [KEY, gigId],
    queryFn: () => apiFetch<Refund[]>("GET", `/gigs/${gigId}/refunds`),
    enabled: !!gigId,
  });
}

export function useCreateRefund() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateRefundRequest) =>
      apiFetch<Refund>("POST", "/refunds", input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: [KEY, input.gigId] });
      qc.invalidateQueries({ queryKey: [INVOICES_KEY, "gig", input.gigId] });
    },
    successMessage: "Refund recorded",
  });
}

export function useUpdateRefund() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateRefundRequest }) =>
      apiFetch<Refund>("PUT", `/refunds/${id}`, input),
    onSuccess: (_data, { input }) => {
      qc.invalidateQueries({ queryKey: [ALL_GIG_PAYMENTS_KEY] });
      if (input.gigId) {
        qc.invalidateQueries({ queryKey: [KEY, input.gigId] });
        qc.invalidateQueries({ queryKey: [INVOICES_KEY, "gig", input.gigId] });
      }
    },
    successMessage: "Refund updated",
  });
}

export function useDeleteRefund() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, gigId }: { id: number; gigId: number }) =>
      apiFetch<void>("DELETE", `/refunds/${id}`),
    onSuccess: (_data, { gigId }) => {
      qc.invalidateQueries({ queryKey: [KEY, gigId] });
      qc.invalidateQueries({ queryKey: [INVOICES_KEY, "gig", gigId] });
    },
    successMessage: "Refund deleted",
  });
}

export function useGenerateCreditNote() {
  return useApiMutation({
    mutationFn: async (refundId: number): Promise<string> => {
      const blob = await apiFetchBlob("POST", `/refunds/${refundId}/credit-note`);
      return URL.createObjectURL(blob);
    },
    successMessage: "Credit note generated",
  });
}
