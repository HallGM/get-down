import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssignedRole } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "roles";

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
    onSuccess: (_data, input) => {
      if (input.gigId) qc.invalidateQueries({ queryKey: [KEY, "gig", input.gigId] });
      if (input.showcaseId) qc.invalidateQueries({ queryKey: [KEY, "showcase", input.showcaseId] });
    },
    successMessage: "Role added",
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id }: { id: number; gigId?: number; showcaseId?: number }) =>
      apiFetch<void>("DELETE", `/assigned-roles/${id}`),
    onSuccess: (_data, { gigId, showcaseId }) => {
      if (gigId) qc.invalidateQueries({ queryKey: [KEY, "gig", gigId] });
      if (showcaseId) qc.invalidateQueries({ queryKey: [KEY, "showcase", showcaseId] });
    },
    successMessage: "Role removed",
  });
}
