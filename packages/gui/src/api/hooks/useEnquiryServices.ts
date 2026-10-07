import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { EnquiryService, CreateEnquiryServiceRequest, UpdateEnquiryServiceRequest } from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";
const KEY = "enquiry-services";
export function useEnquiryServices() { return useQuery({ queryKey: [KEY], queryFn: () => apiFetch<EnquiryService[]>("GET", "/enquiry-services") }); }
export function useCreateEnquiryService() { const qc = useQueryClient(); return useApiMutation({ mutationFn: (input: CreateEnquiryServiceRequest) => apiFetch<EnquiryService>("POST", "/enquiry-services", input), onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }), successMessage: "Enquiry service created" }); }
export function useUpdateEnquiryService() { const qc = useQueryClient(); return useApiMutation({ mutationFn: ({ id, input }: { id: number; input: UpdateEnquiryServiceRequest }) => apiFetch<EnquiryService>("PUT", `/enquiry-services/${id}`, input), onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }), successMessage: "Enquiry service renamed" }); }
export function useDeleteEnquiryService() { const qc = useQueryClient(); return useApiMutation({ mutationFn: (id: number) => apiFetch<void>("DELETE", `/enquiry-services/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }), successMessage: "Enquiry service deleted" }); }
