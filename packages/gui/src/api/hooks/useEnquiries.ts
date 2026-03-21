import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Enquiry,
  EnquiryResponse,
  CreateEnquiryRequest,
} from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "enquiries";

export function useEnquiries() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<EnquiryResponse[]>("GET", "/enquiries"),
  });
}

export function useCreateEnquiry() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateEnquiryRequest) =>
      apiFetch<Enquiry>("POST", "/enquiry", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Enquiry created",
  });
}

export function useDeleteEnquiry() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) => apiFetch<void>("DELETE", `/enquiry/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    successMessage: "Enquiry deleted",
  });
}

export function useGenerateEmailMessage() {
  return useApiMutation({
    mutationFn: (input: { firstName: string; partnersName?: string; services: string[] }) =>
      apiFetch<{ message: string }>("POST", "/enquiry/message", input),
  });
}
