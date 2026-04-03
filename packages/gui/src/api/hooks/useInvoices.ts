import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreateInvoiceLineItemRequest,
} from "@get-down/shared";
import { apiFetch, apiFetchBlob } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "invoices";

export function useGigInvoices(gigId: number) {
  return useQuery({
    queryKey: [KEY, "gig", gigId],
    queryFn: () => apiFetch<Invoice[]>("GET", `/gigs/${gigId}/invoices`),
    enabled: !!gigId,
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => apiFetch<Invoice>("GET", `/invoices/${id}`),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateInvoiceRequest) =>
      apiFetch<Invoice>("POST", "/invoices", input),
    onSuccess: (_data, input) =>
      qc.invalidateQueries({ queryKey: [KEY, "gig", input.gigId] }),
    successMessage: "Invoice saved",
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateInvoiceRequest }) =>
      apiFetch<Invoice>("PUT", `/invoices/${id}`, input),
    onSuccess: (_data, { id }) =>
      qc.invalidateQueries({ queryKey: [KEY, id] }),
    successMessage: "Invoice updated",
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, gigId }: { id: number; gigId: number }) =>
      apiFetch<void>("DELETE", `/invoices/${id}`),
    onSuccess: (_data, { gigId }) =>
      qc.invalidateQueries({ queryKey: [KEY, "gig", gigId] }),
    successMessage: "Invoice deleted",
  });
}

export function useAddLineItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ invoiceId, input }: { invoiceId: number; input: CreateInvoiceLineItemRequest }) =>
      apiFetch("POST", `/invoices/${invoiceId}/line-items`, input),
    onSuccess: (_data, { invoiceId }) =>
      qc.invalidateQueries({ queryKey: [KEY, invoiceId] }),
    successMessage: "Line item added",
  });
}

export function useRemoveLineItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ invoiceId, itemId }: { invoiceId: number; itemId: number }) =>
      apiFetch<void>("DELETE", `/invoices/${invoiceId}/line-items/${itemId}`),
    onSuccess: (_data, { invoiceId }) =>
      qc.invalidateQueries({ queryKey: [KEY, invoiceId] }),
    successMessage: "Line item removed",
  });
}

export function useAddAdditionalCharge() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ invoiceId, input }: { invoiceId: number; input: CreateInvoiceLineItemRequest }) =>
      apiFetch("POST", `/invoices/${invoiceId}/additional-charges`, input),
    onSuccess: (_data, { invoiceId }) =>
      qc.invalidateQueries({ queryKey: [KEY, invoiceId] }),
    successMessage: "Charge added",
  });
}

export function useRemoveAdditionalCharge() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ invoiceId, chargeId }: { invoiceId: number; chargeId: number }) =>
      apiFetch<void>("DELETE", `/invoices/${invoiceId}/additional-charges/${chargeId}`),
    onSuccess: (_data, { invoiceId }) =>
      qc.invalidateQueries({ queryKey: [KEY, invoiceId] }),
    successMessage: "Charge removed",
  });
}

export function useAddPaymentMade() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({
      invoiceId,
      input,
    }: {
      invoiceId: number;
      input: { description?: string; date?: string; amount?: number };
    }) => apiFetch("POST", `/invoices/${invoiceId}/payments-made`, input),
    onSuccess: (_data, { invoiceId }) =>
      qc.invalidateQueries({ queryKey: [KEY, invoiceId] }),
    successMessage: "Payment recorded",
  });
}

export function useRemovePaymentMade() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ invoiceId, paymentMadeId }: { invoiceId: number; paymentMadeId: number }) =>
      apiFetch<void>("DELETE", `/invoices/${invoiceId}/payments-made/${paymentMadeId}`),
    onSuccess: (_data, { invoiceId }) =>
      qc.invalidateQueries({ queryKey: [KEY, invoiceId] }),
    successMessage: "Payment removed",
  });
}

/** Fetch the live preview PDF for a gig's current account data (not saved). */
export function useInvoicePreview() {
  return useApiMutation({
    mutationFn: async ({ gigId, invoiceType }: { gigId: number; invoiceType: 'deposit' | 'balance' }) => {
      const blob = await apiFetchBlob("GET", `/gigs/${gigId}/invoice-preview?invoiceType=${invoiceType}`);
      return URL.createObjectURL(blob);
    },
  });
}

/** Fetch the PDF for a saved invoice. */
export function useSavedInvoicePdf() {
  return useApiMutation({
    mutationFn: async (invoiceId: number) => {
      const blob = await apiFetchBlob("POST", `/invoices/${invoiceId}/generate-pdf`);
      return URL.createObjectURL(blob);
    },
  });
}
