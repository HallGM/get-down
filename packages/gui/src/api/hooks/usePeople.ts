import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Person, CreatePersonRequest, UpdatePersonRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";
import { PEOPLE_KEY, invalidateRoleLinkCaches } from "./queryKeys.js";

export const KEY = PEOPLE_KEY;

export function usePeople() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<Person[]>("GET", "/people"),
  });
}

export function usePerson(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<Person>("GET", `/people/${id}`),
    enabled: !!id,
  });
}

export function usePersonRoles(id: number) {
  return useQuery({ queryKey: [KEY, id, "roles"], queryFn: () => apiFetch<NonNullable<Person["roles"]>>("GET", `/people/${id}/roles`), enabled: !!id });
}

export function useAddPersonRole() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ personId, roleId }: { personId: number; roleId: number }) => apiFetch<void>("POST", `/people/${personId}/roles`, { roleId }),
    onSuccess: (_data, variables) => invalidateRoleLinkCaches(qc, variables.personId, variables.roleId),
    successMessage: "Role added",
  });
}

export function useRemovePersonRole() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ personId, roleId }: { personId: number; roleId: number }) => apiFetch<void>("DELETE", `/people/${personId}/roles/${roleId}`),
    onSuccess: (_data, variables) => invalidateRoleLinkCaches(qc, variables.personId, variables.roleId),
    successMessage: "Role removed",
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreatePersonRequest) =>
      apiFetch<Person>("POST", "/people", input),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: [KEY] });
      void qc.invalidateQueries({ queryKey: [KEY, data.id] });
    },
    successMessage: "Person created",
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePersonRequest }) =>
      apiFetch<Person>("PUT", `/people/${id}`, input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: [KEY] });
      void qc.invalidateQueries({ queryKey: [KEY, variables.id] });
    },
    successMessage: "Person saved",
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/people/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Person deleted",
  });
}

export function useGeneratePerformerToken() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<Person>("POST", `/people/${id}/generate-token`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
