import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Expense, CreateExpenseRequest, UpdateExpenseRequest } from "@get-down/shared";
import { apiFetch, apiFetchFormData } from "../client.js";
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
    mutationFn: async ({ input, file }: { input: CreateExpenseRequest; file?: File }) => {
      const expense = await apiFetch<Expense>("POST", "/expenses", input);
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        await apiFetchFormData<void>("POST", `/expenses/${expense.id}/document`, formData);
      }
      return expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["all-expense-payments"] });
    },
    successMessage: "Expense added",
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateExpenseRequest }) =>
      apiFetch<Expense>("PUT", `/expenses/${id}`, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, id] });
    },
    successMessage: "Expense saved",
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    successMessage: "Expense deleted",
  });
}

export function useUploadExpenseDocument() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiFetchFormData<void>("POST", `/expenses/${id}/document`, formData);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Document uploaded",
  });
}

export function useDeleteExpenseDocument() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/expenses/${id}/document`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Document removed",
  });
}

export function useLinkAllocationToExpense() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ expenseId, allocationId }: { expenseId: number; allocationId: number }) =>
      apiFetch<void>("POST", `/expenses/${expenseId}/fee-allocations`, { allocationId }),
    onSuccess: (_data, { expenseId }) => {
      qc.invalidateQueries({ queryKey: [KEY, expenseId] });
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["fee-allocations"] });
      qc.invalidateQueries({ queryKey: ["gig-fee-allocations"] });
    },
    successMessage: "Allocation linked",
  });
}

export function useLinkAttributionFeeToExpense() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ expenseId, feeId }: { expenseId: number; feeId: number }) =>
      apiFetch<void>("POST", `/expenses/${expenseId}/attribution-fees`, { feeId }),
    onSuccess: (_data, { expenseId }) => {
      qc.invalidateQueries({ queryKey: [KEY, expenseId] });
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["attribution-fees"] });
    },
    successMessage: "Attribution fee linked",
  });
}

export function useUnlinkAttributionFeeFromExpense() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ expenseId, feeId }: { expenseId: number; feeId: number }) =>
      apiFetch<void>("DELETE", `/expenses/${expenseId}/attribution-fees/${feeId}`),
    onSuccess: (_data, { expenseId }) => {
      qc.invalidateQueries({ queryKey: [KEY, expenseId] });
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["attribution-fees"] });
    },
    successMessage: "Attribution fee unlinked",
  });
}

export function useUnlinkAllocationFromExpense() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ expenseId, allocationId }: { expenseId: number; allocationId: number }) =>
      apiFetch<void>("DELETE", `/expenses/${expenseId}/fee-allocations/${allocationId}`),
    onSuccess: (_data, { expenseId }) => {
      qc.invalidateQueries({ queryKey: [KEY, expenseId] });
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["fee-allocations"] });
      qc.invalidateQueries({ queryKey: ["gig-fee-allocations"] });
    },
    successMessage: "Allocation unlinked",
  });
}

