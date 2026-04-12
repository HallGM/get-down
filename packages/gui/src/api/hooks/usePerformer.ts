import { useQuery } from "@tanstack/react-query";
import type { PerformerResponse, PerformerGigDetail } from "@get-down/shared";
import { publicFetch } from "../client.js";

export function usePerformer(token: string) {
  return useQuery({
    queryKey: ["performer", token],
    queryFn: () => publicFetch<PerformerResponse>("GET", `/performer/${token}`),
    enabled: !!token,
    retry: false,
  });
}

export function usePerformerGig(token: string, gigId: number) {
  return useQuery({
    queryKey: ["performer", token, "gigs", gigId],
    queryFn: () => publicFetch<PerformerGigDetail>("GET", `/performer/${token}/gigs/${gigId}`),
    enabled: !!token && !!gigId,
    retry: false,
  });
}
