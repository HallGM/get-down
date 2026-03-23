import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { GigSongPreferences } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "song-preferences";

export function useGigSongPreferences(gigId: number) {
  return useQuery({
    queryKey: [KEY, gigId],
    queryFn: () => apiFetch<GigSongPreferences>("GET", `/gigs/${gigId}/song-preferences`),
    enabled: !!gigId,
  });
}

export function useUpdateGigSongPreferences() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ gigId, input }: { gigId: number; input: GigSongPreferences }) =>
      apiFetch<GigSongPreferences>("PUT", `/gigs/${gigId}/song-preferences`, input),
    onSuccess: (_data, { gigId }) =>
      qc.invalidateQueries({ queryKey: [KEY, gigId] }),
    successMessage: "Preferences saved",
  });
}
