import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Rehearsal, CreateRehearsalRequest, UpdateRehearsalRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const GIG_KEY = "gig-rehearsals";

export function useGigRehearsals(gigId: number) {
  return useQuery({
    queryKey: [GIG_KEY, gigId],
    queryFn: () => apiFetch<Rehearsal[]>("GET", `/gigs/${gigId}/rehearsals`),
    enabled: !!gigId,
  });
}

export function useCreateGigRehearsal(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateRehearsalRequest) =>
      apiFetch<Rehearsal>("POST", `/gigs/${gigId}/rehearsals`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [GIG_KEY, gigId] }),
    successMessage: "Rehearsal added",
  });
}

export function useUpdateGigRehearsal(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateRehearsalRequest }) =>
      apiFetch<Rehearsal>("PUT", `/rehearsals/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [GIG_KEY, gigId] }),
    successMessage: "Rehearsal saved",
  });
}

export function useLinkExistingRehearsal(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (rehearsalId: number) =>
      apiFetch<void>("POST", `/gigs/${gigId}/rehearsals/${rehearsalId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [GIG_KEY, gigId] }),
    successMessage: "Rehearsal linked",
  });
}

export function useUnlinkGigRehearsal(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (rehearsalId: number) =>
      apiFetch<void>("DELETE", `/gigs/${gigId}/rehearsals/${rehearsalId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [GIG_KEY, gigId] }),
    successMessage: "Rehearsal removed",
  });
}

export function useSetRehearsalExpense(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ rehearsalId, expenseId }: { rehearsalId: number; expenseId: number }) =>
      apiFetch<void>("PUT", `/rehearsals/${rehearsalId}/expense`, { expenseId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GIG_KEY, gigId] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    successMessage: "Expense linked",
  });
}

export function useClearRehearsalExpense(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (rehearsalId: number) =>
      apiFetch<void>("DELETE", `/rehearsals/${rehearsalId}/expense`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GIG_KEY, gigId] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    successMessage: "Expense unlinked",
  });
}

export function useUpdateRehearsalCostShare(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ rehearsalId, costShare }: { rehearsalId: number; costShare: number }) =>
      apiFetch<void>("PUT", `/rehearsals/${rehearsalId}/gigs/${gigId}/cost-share`, { costShare }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [GIG_KEY, gigId] }),
    successMessage: "Cost share updated",
  });
}
