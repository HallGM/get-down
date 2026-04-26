import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role, CreateRoleRequest, UpdateRoleRequest } from "@get-down/shared";
import { apiFetch, ApiError } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const ROLES_KEY = "roles-list";
const SERVICE_ROLES_KEY = "service-roles";

export function useRoles() {
  return useQuery({
    queryKey: [ROLES_KEY],
    queryFn: () => apiFetch<Role[]>("GET", "/roles"),
  });
}

export function useServiceRoles(serviceId: number) {
  return useQuery({
    queryKey: [SERVICE_ROLES_KEY, serviceId],
    queryFn: () => apiFetch<Role[]>("GET", `/services/${serviceId}/roles`),
    enabled: !!serviceId,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateRoleRequest) => apiFetch<Role>("POST", "/roles", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROLES_KEY] }),
    successMessage: "Role created",
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateRoleRequest }) =>
      apiFetch<Role>("PUT", `/roles/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROLES_KEY] }),
    successMessage: "Role saved",
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROLES_KEY] }),
    successMessage: "Role deleted",
  });
}

export function useAddRoleToService(serviceId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (roleId: number) =>
      apiFetch<void>("POST", `/services/${serviceId}/roles`, { roleId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SERVICE_ROLES_KEY, serviceId] }),
    successMessage: "Role added to service",
  });
}

export function useRemoveRoleFromService(serviceId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (roleServicesId: number) =>
      apiFetch<void>("DELETE", `/services/${serviceId}/roles/${roleServicesId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SERVICE_ROLES_KEY, serviceId] }),
    successMessage: "Role removed from service",
  });
}

/** Creates a brand-new global role and immediately attaches it to the given service. */
export function useCreateAndAttachRole(serviceId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: async (name: string) => {
      const role = await apiFetch<Role>("POST", "/roles", { name });
      await apiFetch<void>("POST", `/services/${serviceId}/roles`, { roleId: role.id });
      return role;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ROLES_KEY] });
      qc.invalidateQueries({ queryKey: [SERVICE_ROLES_KEY, serviceId] });
    },
    errorMessage: (err) =>
      err instanceof ApiError && err.status === 409
        ? "A role with that name already exists — select it from the list instead"
        : err.message,
    successMessage: "Role created and added to service",
  });
}
