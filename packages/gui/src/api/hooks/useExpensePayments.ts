import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExpensePayment, CreateExpensePaymentRequest, UpdateExpensePaymentRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "expense-payments";

export function useExpensePayments(expenseId: number) {
  return useQuery({
    queryKey: [KEY, expenseId],
    queryFn: () => apiFetch<ExpensePayment[]>("GET", `/expenses/${expenseId}/payments`),
    enabled: !!expenseId,
  });
}

export function useCreateExpensePayment(expenseId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateExpensePaymentRequest) =>
      apiFetch<ExpensePayment>("POST", `/expenses/${expenseId}/payments`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, expenseId] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    successMessage: "Payment recorded",
  });
}

export function useUpdateExpensePayment(expenseId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ paymentId, input }: { paymentId: number; input: UpdateExpensePaymentRequest }) =>
      apiFetch<ExpensePayment>("PUT", `/expenses/${expenseId}/payments/${paymentId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, expenseId] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    successMessage: "Payment updated",
  });
}

export function useDeleteExpensePayment(expenseId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (paymentId: number) =>
      apiFetch<void>("DELETE", `/expenses/${expenseId}/payments/${paymentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, expenseId] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    successMessage: "Payment deleted",
  });
}
