import { useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";
import type { Showcase, ShowcaseGigSummary, CreateShowcaseRequest, UpdateShowcaseRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "showcases";

function invalidateShowcase(qc: QueryClient, showcaseId: number) {
  qc.invalidateQueries({ queryKey: [KEY] });
  qc.invalidateQueries({ queryKey: [KEY, showcaseId] });
  qc.invalidateQueries({ queryKey: [KEY, showcaseId, "gigs"] });
}

export function useShowcases() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<Showcase[]>("GET", "/showcases"),
  });
}

export function useShowcase(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<Showcase>("GET", `/showcases/${id}`),
    enabled: !!id,
  });
}

export function useCreateShowcase() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateShowcaseRequest) =>
      apiFetch<Showcase>("POST", "/showcases", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Showcase created",
  });
}

export function useUpdateShowcase() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateShowcaseRequest }) =>
      apiFetch<Showcase>("PUT", `/showcases/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Showcase saved",
  });
}

export function useDeleteShowcase() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/showcases/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Showcase deleted",
  });
}

export function useLinkExpenseToShowcase() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ showcaseId, expenseId }: { showcaseId: number; expenseId: number }) =>
      apiFetch<void>("POST", `/showcases/${showcaseId}/expenses`, { expenseId }),
    onSuccess: (_data, { showcaseId }) => invalidateShowcase(qc, showcaseId),
    successMessage: "Expense linked",
  });
}

export function useUnlinkExpenseFromShowcase() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ showcaseId, expenseId }: { showcaseId: number; expenseId: number }) =>
      apiFetch<void>("DELETE", `/showcases/${showcaseId}/expenses/${expenseId}`),
    onSuccess: (_data, { showcaseId }) => invalidateShowcase(qc, showcaseId),
    successMessage: "Expense unlinked",
  });
}

export function useUpdateShowcaseExpenseLink() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({
      showcaseId,
      expenseId,
      apportionedAmount,
    }: {
      showcaseId: number;
      expenseId: number;
      apportionedAmount: number | null;
    }) =>
      apiFetch<void>("PATCH", `/showcases/${showcaseId}/expenses/${expenseId}`, {
        apportionedAmount,
      }),
    onSuccess: (_data, { showcaseId }) => invalidateShowcase(qc, showcaseId),
    successMessage: "Apportionment updated",
  });
}

export function useShowcaseGigs(showcaseId: number) {
  return useQuery({
    queryKey: [KEY, showcaseId, "gigs"],
    queryFn: () => apiFetch<ShowcaseGigSummary[]>("GET", `/showcases/${showcaseId}/gigs`),
    enabled: !!showcaseId,
  });
}
