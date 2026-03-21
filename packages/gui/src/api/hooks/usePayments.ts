import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Payment, CreatePaymentRequest, UpdatePaymentRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "payments";

export function useGigPayments(gigId: number) {
  return useQuery({
    queryKey: [KEY, gigId],
    queryFn: () => apiFetch<Payment[]>("GET", `/gigs/${gigId}/payments`),
    enabled: !!gigId,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreatePaymentRequest) =>
      apiFetch<Payment>("POST", "/payments", input),
    onSuccess: (_data, input) =>
      qc.invalidateQueries({ queryKey: [KEY, input.gigId] }),
    successMessage: "Payment added",
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePaymentRequest }) =>
      apiFetch<Payment>("PUT", `/payments/${id}`, input),
    onSuccess: (_data, { input }) => {
      if (input.gigId) qc.invalidateQueries({ queryKey: [KEY, input.gigId] });
    },
    successMessage: "Payment updated",
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, gigId }: { id: number; gigId: number }) =>
      apiFetch<void>("DELETE", `/payments/${id}`),
    onSuccess: (_data, { gigId }) =>
      qc.invalidateQueries({ queryKey: [KEY, gigId] }),
    successMessage: "Payment deleted",
  });
}
