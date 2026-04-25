import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { AssignedRole, UpdateAssignedRoleRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "roles";

function invalidateRoleCaches(qc: QueryClient, gigId?: number, showcaseId?: number) {
  if (gigId) qc.invalidateQueries({ queryKey: [KEY, "gig", gigId] });
  if (showcaseId) qc.invalidateQueries({ queryKey: [KEY, "showcase", showcaseId] });
}

export function useGigRoles(gigId: number) {
  return useQuery({
    queryKey: [KEY, "gig", gigId],
    queryFn: () => apiFetch<AssignedRole[]>("GET", `/gigs/${gigId}/roles`),
    enabled: !!gigId,
  });
}

export function useShowcaseRoles(showcaseId: number) {
  return useQuery({
    queryKey: [KEY, "showcase", showcaseId],
    queryFn: () => apiFetch<AssignedRole[]>("GET", `/showcases/${showcaseId}/roles`),
    enabled: !!showcaseId,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: { gigId?: number; showcaseId?: number; personId?: number; roleName: string }) =>
      apiFetch<AssignedRole>("POST", "/assigned-roles", input),
    onSuccess: (_data, input) => invalidateRoleCaches(qc, input.gigId, input.showcaseId),
    successMessage: "Role added",
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; gigId?: number; showcaseId?: number; input: UpdateAssignedRoleRequest }) =>
      // gigId / showcaseId are not sent to the API; used only for cache invalidation in onSuccess
      apiFetch<AssignedRole>("PUT", `/assigned-roles/${id}`, input),
    onSuccess: (_data, { gigId, showcaseId }) => invalidateRoleCaches(qc, gigId, showcaseId),
    successMessage: "Role updated",
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id }: { id: number; gigId?: number; showcaseId?: number }) =>
      apiFetch<void>("DELETE", `/assigned-roles/${id}`),
    onSuccess: (_data, { gigId, showcaseId }) => invalidateRoleCaches(qc, gigId, showcaseId),
    successMessage: "Role removed",
  });
}

export function useImportRolesFromServices(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: () => apiFetch<AssignedRole[]>("POST", `/gigs/${gigId}/roles/import`),
    onSuccess: () => invalidateRoleCaches(qc, gigId),
    successMessage: "Roles imported",
  });
}
