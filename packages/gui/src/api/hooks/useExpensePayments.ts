import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Expense, ExpensePayment, ExpensePaymentSummary, CreateExpensePaymentRequest, UpdateExpensePaymentRequest, UpdateExpensePaymentSharesRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "expense-payments";
const ALL_KEY = "all-expense-payments";

export function useAllExpensePayments() {
  return useQuery({
    queryKey: [ALL_KEY],
    queryFn: () => apiFetch<ExpensePaymentSummary[]>("GET", "/expense-payments"),
  });
}

export function useEligiblePaymentExpenses() {
  return useQuery({
    queryKey: ["expense-payment-expenses"],
    queryFn: async () => {
      const expenses = (await apiFetch<Expense[] | null>("GET", "/expenses")) ?? [];
      return expenses
        .filter((expense) => !expense.isTaxOnly)
        .map(({ id, description, amount }) => ({ id, description, amount }));
    },
  });
}

function invalidatePaymentData(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [KEY] });
  qc.invalidateQueries({ queryKey: [ALL_KEY] });
  qc.invalidateQueries({ queryKey: ["expenses"] });
  qc.invalidateQueries({ queryKey: ["accounts"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateExpensePaymentRequest) => apiFetch<ExpensePayment>("POST", "/expense-payments", input),
    onSuccess: () => invalidatePaymentData(qc),
    successMessage: "Payment recorded",
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ paymentId, input }: { paymentId: number; input: UpdateExpensePaymentRequest }) => apiFetch<ExpensePayment>("PUT", `/expense-payments/${paymentId}`, input),
    onSuccess: () => invalidatePaymentData(qc),
    successMessage: "Payment updated",
  });
}

export function useUpdatePaymentShares() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ paymentId, input }: { paymentId: number; input: UpdateExpensePaymentSharesRequest }) => apiFetch<ExpensePayment>("PUT", `/expense-payments/${paymentId}/shares`, input),
    onSuccess: () => invalidatePaymentData(qc),
    successMessage: "Payment shares updated",
  });
}

export function useDeletePaymentShare() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ paymentId, expenseId }: { paymentId: number; expenseId: number }) => apiFetch<void>("DELETE", `/expense-payments/${paymentId}/shares/${expenseId}`),
    onSuccess: () => invalidatePaymentData(qc),
    successMessage: "Payment share removed",
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (paymentId: number) => apiFetch<void>("DELETE", `/expense-payments/${paymentId}`),
    onSuccess: () => invalidatePaymentData(qc),
    successMessage: "Payment deleted",
  });
}

export function useExpensePayments(expenseId: number) {
  return useQuery({
    queryKey: [KEY, expenseId],
    queryFn: () => apiFetch<ExpensePayment[]>("GET", `/expenses/${expenseId}/payments`),
    enabled: !!expenseId,
  });
}
