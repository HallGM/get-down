import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Service, ServiceGroup, CreateServiceRequest, UpdateServiceRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

export const SERVICES_KEY = "services";
export const SERVICE_GROUPS_KEY = "service-groups";

export function useServiceGroups() {
  return useQuery({
    queryKey: [SERVICE_GROUPS_KEY],
    queryFn: async () => (await apiFetch<ServiceGroup[] | null>("GET", "/service-groups")) ?? [],
  });
}

export function useServices() {
  return useQuery({
    queryKey: [SERVICES_KEY],
    queryFn: () => apiFetch<Service[]>("GET", "/services"),
  });
}

export function useService(id: number) {
  return useQuery({
    queryKey: [SERVICES_KEY, id],
    queryFn: () => apiFetch<Service>("GET", `/services/${id}`),
    enabled: !!id,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateServiceRequest) =>
      apiFetch<Service>("POST", "/services", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SERVICES_KEY] }),
    successMessage: "Service created",
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateServiceRequest }) =>
      apiFetch<Service>("PUT", `/services/${id}`, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [SERVICES_KEY] });
      qc.invalidateQueries({ queryKey: [SERVICES_KEY, id] });
    },
    successMessage: "Service saved",
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SERVICES_KEY] }),
    successMessage: "Service deleted",
  });
}
