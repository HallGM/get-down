import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Showcase, CreateShowcaseRequest, UpdateShowcaseRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "showcases";

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
