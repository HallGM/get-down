import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Song, CreateSongRequest, UpdateSongRequest, SetListItem } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "songs";
const SET_LIST_KEY = "set-list";

export function useSongs() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<Song[]>("GET", "/songs"),
  });
}

export function useCreateSong() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateSongRequest) =>
      apiFetch<Song>("POST", "/songs", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Song added",
  });
}

export function useUpdateSong() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateSongRequest }) =>
      apiFetch<Song>("PUT", `/songs/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Song saved",
  });
}

export function useDeleteSong() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/songs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Song deleted",
  });
}

export function useGigSetList(gigId: number) {
  return useQuery({
    queryKey: [SET_LIST_KEY, gigId],
    queryFn: () => apiFetch<SetListItem[]>("GET", `/gigs/${gigId}/set-list`),
    enabled: !!gigId,
  });
}

export function useAddSetListItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ gigId, songId, position }: { gigId: number; songId: number; position?: number }) =>
      apiFetch<SetListItem>("POST", `/gigs/${gigId}/set-list`, { songId, position }),
    onSuccess: (_data, { gigId }) =>
      qc.invalidateQueries({ queryKey: [SET_LIST_KEY, gigId] }),
    successMessage: "Song added to set list",
  });
}

export function useRemoveSetListItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ gigId, itemId }: { gigId: number; itemId: number }) =>
      apiFetch<void>("DELETE", `/gigs/${gigId}/set-list/${itemId}`),
    onSuccess: (_data, { gigId }) =>
      qc.invalidateQueries({ queryKey: [SET_LIST_KEY, gigId] }),
    successMessage: "Song removed from set list",
  });
}
