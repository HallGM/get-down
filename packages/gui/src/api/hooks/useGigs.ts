import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Gig,
  GigLineItem,
  CreateGigRequest,
  UpdateGigRequest,
  CreateGigLineItemRequest,
} from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "gigs";

export function useGigs() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<Gig[]>("GET", "/gigs"),
  });
}

export function useGig(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<Gig>("GET", `/gigs/${id}`),
    enabled: !!id,
  });
}

export function useCreateGig() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateGigRequest) =>
      apiFetch<Gig>("POST", "/gigs", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Gig created",
  });
}

export function useUpdateGig() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateGigRequest }) =>
      apiFetch<Gig>("PUT", `/gigs/${id}`, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, id] });
    },
    successMessage: "Gig saved",
  });
}

export function useDeleteGig() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/gigs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Gig deleted",
  });
}

export function useSetGigServices() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ gigId, serviceIds }: { gigId: number; serviceIds: number[] }) =>
      apiFetch<void>("PUT", `/gigs/${gigId}/services`, { serviceIds }),
    onSuccess: (_data, { gigId }) =>
      qc.invalidateQueries({ queryKey: [KEY, gigId] }),
    successMessage: "Services updated",
  });
}

export function useConvertEnquiryToGig() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (enquiryId: number) =>
      apiFetch<Gig>("POST", `/enquiries/${enquiryId}/convert-to-gig`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Enquiry converted to gig",
  });
}

export function useAddGigLineItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ gigId, input }: { gigId: number; input: CreateGigLineItemRequest }) =>
      apiFetch<GigLineItem>("POST", `/gigs/${gigId}/line-items`, input),
    onSuccess: (_data, { gigId }) => qc.invalidateQueries({ queryKey: [KEY, gigId] }),
    successMessage: "Line item added",
  });
}

export function useRemoveGigLineItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ gigId, itemId }: { gigId: number; itemId: number }) =>
      apiFetch<void>("DELETE", `/gigs/${gigId}/line-items/${itemId}`),
    onSuccess: (_data, { gigId }) => qc.invalidateQueries({ queryKey: [KEY, gigId] }),
    successMessage: "Line item removed",
  });
}

export function useGenerateLineItems() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (gigId: number) =>
      apiFetch<GigLineItem[]>("POST", `/gigs/${gigId}/generate-line-items`),
    onSuccess: (_data, gigId) => qc.invalidateQueries({ queryKey: [KEY, gigId] }),
    successMessage: "Line items generated from services",
  });
}
