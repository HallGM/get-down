import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Service, CreateServiceRequest, UpdateServiceRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "services";

export function useServices() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<Service[]>("GET", "/services"),
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateServiceRequest) =>
      apiFetch<Service>("POST", "/services", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Service created",
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateServiceRequest }) =>
      apiFetch<Service>("PUT", `/services/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Service saved",
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Service deleted",
  });
}
