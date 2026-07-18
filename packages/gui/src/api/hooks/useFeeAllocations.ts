import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Expense, FeeAllocation, FeeAllocationLineItem, FeeAllocationSummary, UpdateFeeAllocationLineItemRequest, CreateFeeAllocationLineItemRequest, CreateExpenseRequest } from "@get-down/shared";
import { apiFetch, apiFetchFormData } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "fee-allocations";
const GIG_KEY = "gig-fee-allocations";
const SHOWCASE_KEY = "showcase-fee-allocations";
const SUMMARY_KEY = "fee-allocation-summaries";

function invalidateLineItemCaches(qc: QueryClient, allocationId: number) {
  qc.invalidateQueries({ queryKey: [KEY, allocationId] });
  qc.invalidateQueries({ queryKey: [GIG_KEY] });
  qc.invalidateQueries({ queryKey: [SHOWCASE_KEY] });
  // Line item changes affect the account ledger balance, so invalidate accounts too.
  qc.invalidateQueries({ queryKey: ["accounts"] });
}

export function useFeeAllocations() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<FeeAllocation[]>("GET", "/fee-allocations"),
  });
}

export function useFeeAllocationSummaries() {
  return useQuery({
    queryKey: [SUMMARY_KEY],
    queryFn: () => apiFetch<FeeAllocationSummary[]>("GET", "/fee-allocations/summary"),
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
      input: { notes?: string; isInvoiced?: boolean; invoiceRef?: string };
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

export function useFeeAllocationsByShowcase(showcaseId: number) {
  return useQuery({
    queryKey: [SHOWCASE_KEY, showcaseId],
    queryFn: () => apiFetch<FeeAllocation[]>("GET", `/showcases/${showcaseId}/fee-allocations`),
    enabled: !!showcaseId,
  });
}

export function useGenerateFeeAllocationsForShowcase(showcaseId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (force: boolean) =>
      apiFetch<{ conflict: true } | FeeAllocation[]>("POST", `/showcases/${showcaseId}/fee-allocations/generate`, { force }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SHOWCASE_KEY, showcaseId] });
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["roles", "showcase", showcaseId] });
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

function invalidateAllocationCaches(qc: QueryClient, allocationId: number, secondaryKey: string) {
  qc.invalidateQueries({ queryKey: [KEY, allocationId] });
  qc.invalidateQueries({ queryKey: [GIG_KEY] });
  qc.invalidateQueries({ queryKey: [SHOWCASE_KEY] });
  qc.invalidateQueries({ queryKey: [secondaryKey] });
}

export function useGenerateExpenseForAllocation() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (allocationId: number) =>
      apiFetch<Expense>("POST", `/fee-allocations/${allocationId}/expenses/generate`),
    onSuccess: (_data, allocationId) => invalidateAllocationCaches(qc, allocationId, "expenses"),
    successMessage: "Expense generated",
  });
}

export function useLinkExpenseToAllocation() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ allocationId, expenseId }: { allocationId: number; expenseId: number }) =>
      apiFetch<void>("POST", `/fee-allocations/${allocationId}/expenses`, { expenseId }),
    onSuccess: (_data, { allocationId }) => {
      invalidateAllocationCaches(qc, allocationId, "expenses");
      // Invalidate dashboard so unpaid allocations widget updates
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    successMessage: "Expense linked",
  });
}

/**
 * Settle an unpaid allocation by creating a new expense and linking it atomically.
 * Uses a backend transaction to guarantee atomicity.
 */
export function useSettleAllocationWithExpense() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: async ({ allocationId, input, file }: { allocationId: number; input: CreateExpenseRequest; file?: File }) => {
      const expense = await apiFetch<Expense>("POST", `/fee-allocations/${allocationId}/expenses/settle`, input);
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        await apiFetchFormData<void>("POST", `/expenses/${expense.id}/document`, formData);
      }
      return expense;
    },
    onSuccess: () => {
      // Invalidate all related caches
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [GIG_KEY] });
      qc.invalidateQueries({ queryKey: [SHOWCASE_KEY] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    successMessage: "Allocation settled",
  });
}

export function useUnlinkExpenseFromAllocation() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ allocationId, expenseId }: { allocationId: number; expenseId: number }) =>
      apiFetch<void>("DELETE", `/fee-allocations/${allocationId}/expenses/${expenseId}`),
    onSuccess: (_data, { allocationId }) => invalidateAllocationCaches(qc, allocationId, "expenses"),
    successMessage: "Expense unlinked",
  });
}

export function useUpdateFeeAllocationExpenseLink() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({
      allocationId,
      expenseId,
      apportionedAmount,
    }: {
      allocationId: number;
      expenseId: number;
      apportionedAmount: number | null;
    }) =>
      apiFetch<void>("PATCH", `/fee-allocations/${allocationId}/expenses/${expenseId}`, {
        apportionedAmount,
      }),
    onSuccess: (_data, { allocationId }) => {
      invalidateAllocationCaches(qc, allocationId, "expenses");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    successMessage: "Apportionment updated",
  });
}

export function useLinkTransactionToAllocation() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ allocationId, transactionId }: { allocationId: number; transactionId: number }) =>
      apiFetch<void>("POST", `/fee-allocations/${allocationId}/transactions`, { transactionId }),
    onSuccess: (_data, { allocationId }) => invalidateAllocationCaches(qc, allocationId, "accounts"),
    successMessage: "Transaction linked",
  });
}

export function useUnlinkTransactionFromAllocation() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ allocationId, transactionId }: { allocationId: number; transactionId: number }) =>
      apiFetch<void>("DELETE", `/fee-allocations/${allocationId}/transactions/${transactionId}`),
    onSuccess: (_data, { allocationId }) => invalidateAllocationCaches(qc, allocationId, "accounts"),
    successMessage: "Transaction unlinked",
  });
}
