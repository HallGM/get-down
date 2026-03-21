import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Expense, CreateExpenseRequest, UpdateExpenseRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "expenses";

export function useExpenses() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<Expense[]>("GET", "/expenses"),
  });
}

export function useExpense(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<Expense>("GET", `/expenses/${id}`),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateExpenseRequest) =>
      apiFetch<Expense>("POST", "/expenses", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Expense added",
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateExpenseRequest }) =>
      apiFetch<Expense>("PUT", `/expenses/${id}`, input),
    onSuccess: (_data, { id }) => qc.invalidateQueries({ queryKey: [KEY, id] }),
    successMessage: "Expense saved",
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Expense deleted",
  });
}
