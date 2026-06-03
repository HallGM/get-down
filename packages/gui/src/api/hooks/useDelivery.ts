import { useQuery } from "@tanstack/react-query";
import type { DeliveryPageResponse, DeliveryPhoto } from "@get-down/shared";
import { publicFetch } from "../client.js";

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
