import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Song, CreateSongRequest, UpdateSongRequest, SetListItemWithSong, CreateSetListItemRequest, UpdateSetListItemRequest } from "@get-down/shared";
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
    queryFn: () => apiFetch<SetListItemWithSong[]>("GET", `/gigs/${gigId}/set-list`),
    enabled: !!gigId,
  });
}

export function useAddSetListItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ gigId, ...body }: { gigId: number } & CreateSetListItemRequest) =>
      apiFetch<SetListItemWithSong>("POST", `/gigs/${gigId}/set-list`, body),
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

export function useReorderSetList() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ gigId, itemIds }: { gigId: number; itemIds: number[] }) =>
      apiFetch<void>("PUT", `/gigs/${gigId}/set-list/reorder`, { itemIds }),
    onSuccess: (_data, { gigId }) =>
      qc.invalidateQueries({ queryKey: [SET_LIST_KEY, gigId] }),
  });
}

export function useBulkImportSetList() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (gigId: number) =>
      apiFetch<SetListItemWithSong[]>("POST", `/gigs/${gigId}/set-list/import`),
    onSuccess: (_data, gigId) =>
      qc.invalidateQueries({ queryKey: [SET_LIST_KEY, gigId] }),
    successMessage: "Songs imported from preferences",
  });
}

export function useAutoOrderSetList() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (gigId: number) =>
      apiFetch<SetListItemWithSong[]>("POST", `/gigs/${gigId}/set-list/auto-order`),
    onSuccess: (_data, gigId) =>
      qc.invalidateQueries({ queryKey: [SET_LIST_KEY, gigId] }),
    successMessage: "Set list auto-ordered",
  });
}

export function useUpdateSetListItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({
      gigId,
      itemId,
      ...body
    }: { gigId: number; itemId: number } & UpdateSetListItemRequest) =>
      apiFetch<SetListItemWithSong>("PATCH", `/gigs/${gigId}/set-list/${itemId}`, body),
    onMutate: async ({ gigId, itemId, overrideKey, overrideVocalType }) => {
      await qc.cancelQueries({ queryKey: [SET_LIST_KEY, gigId] });
      const previous = qc.getQueryData<SetListItemWithSong[]>([SET_LIST_KEY, gigId]);
      qc.setQueryData<SetListItemWithSong[]>([SET_LIST_KEY, gigId], old =>
        old?.map(item =>
          item.id === itemId
            ? {
                ...item,
                overrideKey: overrideKey === undefined ? item.overrideKey : (overrideKey ?? undefined),
                overrideVocalType: overrideVocalType === undefined ? item.overrideVocalType : (overrideVocalType ?? undefined),
              }
            : item
        )
      );
      return { previous, gigId };
    },
    onError: (_err, _vars, context) => {
      const ctx = context as { previous: SetListItemWithSong[] | undefined; gigId: number } | undefined;
      if (ctx?.previous !== undefined) {
        qc.setQueryData([SET_LIST_KEY, ctx.gigId], ctx.previous);
      }
    },
    onSettled: (_data, _err, { gigId }) => {
      qc.invalidateQueries({ queryKey: [SET_LIST_KEY, gigId] });
    },
  });
}
