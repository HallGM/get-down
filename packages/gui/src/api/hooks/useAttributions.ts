import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Attribution, CreateAttributionRequest, UpdateAttributionRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "attributions";

export function useAttributions() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<Attribution[]>("GET", "/attributions"),
  });
}

export function useCreateAttribution() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateAttributionRequest) =>
      apiFetch<Attribution>("POST", "/attributions", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Attribution added",
  });
}

export function useUpdateAttribution() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateAttributionRequest }) =>
      apiFetch<Attribution>("PUT", `/attributions/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Attribution saved",
  });
}

export function useDeleteAttribution() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/attributions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Attribution deleted",
  });
}
