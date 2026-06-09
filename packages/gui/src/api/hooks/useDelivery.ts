import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DeliveryPageResponse,
  DeliveryPhoto,
  DeliveryVideo,
  CreateDeliveryVideoRequest,
  UpdateDeliveryVideoRequest,
} from "@get-down/shared";
import { publicFetch, apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

export function useDeliveryPage(token: string) {
  return useQuery({
    queryKey: ["delivery", token],
    queryFn: () => publicFetch<DeliveryPageResponse>("GET", `/delivery/${token}`),
    enabled: !!token,
    retry: false,
  });
}

export function useDeliveryPhotos(token: string, enabled: boolean) {
  return useQuery({
    queryKey: ["delivery-photos", token],
    queryFn: () =>
      publicFetch<{ photos: DeliveryPhoto[] }>("GET", `/delivery/${token}/photos`),
    enabled: !!token && enabled,
    retry: false,
  });
}

export function useGigDeliveryVideos(gigId: number) {
  return useQuery({
    queryKey: ["delivery-videos", gigId],
    queryFn: () => apiFetch<DeliveryVideo[]>("GET", `/gigs/${gigId}/delivery-videos`),
    enabled: !!gigId,
  });
}

export function useCreateDeliveryVideo(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateDeliveryVideoRequest) =>
      apiFetch<DeliveryVideo>("POST", `/gigs/${gigId}/delivery-videos`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery-videos", gigId] }),
    successMessage: "Video added",
  });
}

export function useUpdateDeliveryVideo(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ videoId, input }: { videoId: number; input: UpdateDeliveryVideoRequest }) =>
      apiFetch<DeliveryVideo>("PUT", `/gigs/${gigId}/delivery-videos/${videoId}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery-videos", gigId] }),
    successMessage: "Video saved",
  });
}

export function useDeleteDeliveryVideo(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (videoId: number) =>
      apiFetch<void>("DELETE", `/gigs/${gigId}/delivery-videos/${videoId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery-videos", gigId] }),
    successMessage: "Video removed",
  });
}

export function useReorderDeliveryVideos(gigId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (orderedIds: number[]) =>
      apiFetch<void>("PUT", `/gigs/${gigId}/delivery-videos/reorder`, { orderedIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery-videos", gigId] }),
  });
}

export function useRefreshDeliveryPhotos(gigId: number) {
  return useApiMutation({
    mutationFn: () =>
      apiFetch<void>("POST", `/gigs/${gigId}/delivery/refresh-thumbnails`),
    successMessage: "Photos are being regenerated.",
  });
}
