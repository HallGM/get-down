import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PersonInvoice,
  CreatePersonInvoiceRequest,
  UpdatePersonInvoiceRequest,
} from "@get-down/shared";
import { apiFetch, apiFetchBlob } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "person-invoices";

export function useAllPersonInvoices() {
  return useQuery({
    queryKey: [KEY, "all"],
    queryFn: () => apiFetch<PersonInvoice[]>("GET", "/person-invoices"),
  });
}

export function usePersonInvoices(personId: number) {
  return useQuery({
    queryKey: [KEY, "person", personId],
    queryFn: () => apiFetch<PersonInvoice[]>("GET", `/people/${personId}/invoices`),
    enabled: !!personId,
  });
}

export function usePersonInvoice(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<PersonInvoice>("GET", `/person-invoices/${id}`),
    enabled: !!id,
  });
}

export function useCreatePersonInvoice() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreatePersonInvoiceRequest) =>
      apiFetch<PersonInvoice>("POST", "/person-invoices", input),
    onSuccess: (_data, input) =>
      qc.invalidateQueries({ queryKey: [KEY, "person", input.personId] }),
    successMessage: "Person invoice created",
  });
}

export function useUpdatePersonInvoice() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, personId, input }: { id: number; personId: number; input: UpdatePersonInvoiceRequest }) =>
      apiFetch<PersonInvoice>("PUT", `/person-invoices/${id}`, input),
    onSuccess: (_data, { id, personId }) => {
      qc.invalidateQueries({ queryKey: [KEY, id] });
      qc.invalidateQueries({ queryKey: [KEY, "person", personId] });
    },
    successMessage: "Person invoice updated",
  });
}

export function useDeletePersonInvoice() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, personId }: { id: number; personId: number }) =>
      apiFetch<void>("DELETE", `/person-invoices/${id}`),
    onSuccess: (_data, { personId }) =>
      qc.invalidateQueries({ queryKey: [KEY, "person", personId] }),
    successMessage: "Person invoice deleted",
  });
}

export function useGeneratePersonInvoicePdf() {
  return useApiMutation({
    mutationFn: ({ id, filename }: { id: number; filename: string }) =>
      apiFetchBlob("POST", `/person-invoices/${id}/generate-pdf`, {}).then(blob => ({
        blob,
        filename,
      })),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    successMessage: "PDF generated and downloaded",
  });
}

export function useViewPersonInvoicePdf() {
  return useApiMutation({
    mutationFn: ({ id }: { id: number }) =>
      apiFetchBlob("POST", `/person-invoices/${id}/generate-pdf`, {}),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Note: we don't revoke the URL immediately since the new tab needs it
      // The browser will clean it up when the tab is closed
    },
    successMessage: "PDF generated and opened in new tab",
  });
}
