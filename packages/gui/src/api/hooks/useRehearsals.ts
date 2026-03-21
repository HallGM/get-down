import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Rehearsal, CreateRehearsalRequest, UpdateRehearsalRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "rehearsals";

export function useRehearsals() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<Rehearsal[]>("GET", "/rehearsals"),
  });
}

export function useRehearsal(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<Rehearsal>("GET", `/rehearsals/${id}`),
    enabled: !!id,
  });
}

export function useCreateRehearsal() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateRehearsalRequest) =>
      apiFetch<Rehearsal>("POST", "/rehearsals", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Rehearsal added",
  });
}

export function useUpdateRehearsal() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateRehearsalRequest }) =>
      apiFetch<Rehearsal>("PUT", `/rehearsals/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Rehearsal saved",
  });
}

export function useDeleteRehearsal() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/rehearsals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Rehearsal deleted",
  });
}
