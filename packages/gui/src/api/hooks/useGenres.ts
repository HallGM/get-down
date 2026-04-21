import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Genre, CreateGenreRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "genres";

export function useGenres() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<Genre[]>("GET", "/genres"),
  });
}

export function useCreateGenre() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateGenreRequest) =>
      apiFetch<Genre>("POST", "/genres", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Genre added",
  });
}

export function useDeleteGenre() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/genres/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["songs"] });
    },
    successMessage: "Genre deleted",
  });
}
