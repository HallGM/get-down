import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyInvoice, UpdateLegacyInvoiceRequest } from "@get-down/shared";
import { apiFetch, apiFetchFormData } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "legacy-invoices";

export function useGigLegacyInvoices(gigId: number) {
  return useQuery({
    queryKey: [KEY, "gig", gigId],
    queryFn: () => apiFetch<LegacyInvoice[]>("GET", `/gigs/${gigId}/legacy-invoices`),
    enabled: !!gigId,
  });
}

export function useCreateLegacyInvoice() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: async ({
      gigId,
      invoiceNumber,
      date,
      description,
      file,
    }: {
      gigId: number;
      invoiceNumber?: string;
      date?: string;
      description?: string;
      file: File;
    }) => {
      const formData = new FormData();
      if (invoiceNumber) formData.append("invoiceNumber", invoiceNumber);
      if (date) formData.append("date", date);
      if (description) formData.append("description", description);
      formData.append("file", file);
      return apiFetchFormData<LegacyInvoice>("POST", `/gigs/${gigId}/legacy-invoices`, formData);
    },
    onSuccess: (_data, { gigId }) =>
      qc.invalidateQueries({ queryKey: [KEY, "gig", gigId] }),
    successMessage: "Legacy invoice added",
  });
}

export function useUpdateLegacyInvoice() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({
      id,
      gigId,
      input,
    }: {
      id: number;
      gigId: number;
      input: UpdateLegacyInvoiceRequest;
    }) => apiFetch<LegacyInvoice>("PUT", `/legacy-invoices/${id}`, input),
    onSuccess: (_data, { gigId }) =>
      qc.invalidateQueries({ queryKey: [KEY, "gig", gigId] }),
    successMessage: "Legacy invoice updated",
  });
}

export function useReplaceLegacyInvoiceDocument() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, gigId, file }: { id: number; gigId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiFetchFormData<void>("POST", `/legacy-invoices/${id}/document`, formData);
    },
    onSuccess: (_data, { gigId }) =>
      qc.invalidateQueries({ queryKey: [KEY, "gig", gigId] }),
    successMessage: "Document replaced",
  });
}

export function useDeleteLegacyInvoice() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, gigId }: { id: number; gigId: number }) =>
      apiFetch<void>("DELETE", `/legacy-invoices/${id}`),
    onSuccess: (_data, { gigId }) =>
      qc.invalidateQueries({ queryKey: [KEY, "gig", gigId] }),
    successMessage: "Legacy invoice deleted",
  });
}
