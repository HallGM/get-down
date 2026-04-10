import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { HousePlaylistSong } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "house-playlist";

export function useHousePlaylist() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<HousePlaylistSong[]>("GET", "/house-playlist"),
  });
}

export function useAddToHousePlaylist() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (songId: number) =>
      apiFetch<HousePlaylistSong>("POST", "/house-playlist", { songId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Added to house playlist",
  });
}

export function useRemoveFromHousePlaylist() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (songId: number) =>
      apiFetch<void>("DELETE", `/house-playlist/${songId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Removed from house playlist",
  });
}
