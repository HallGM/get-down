import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Person, CreatePersonRequest, UpdatePersonRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "people";

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

export function useCreatePerson() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreatePersonRequest) =>
      apiFetch<Person>("POST", "/people", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Person created",
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePersonRequest }) =>
      apiFetch<Person>("PUT", `/people/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
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
