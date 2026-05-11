import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceAdditionalCharge,
  InvoicePaymentMade,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreateInvoiceLineItemRequest,
  UpdateInvoiceLineItemRequest,
  UpdateInvoiceAdditionalChargeRequest,
  UpdateInvoicePaymentMadeRequest,
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
    mutationFn: ({ id, gigId, input }: { id: number; gigId: number; input: UpdateInvoiceRequest }) =>
      apiFetch<Invoice>("PUT", `/invoices/${id}`, input),
    onSuccess: (_data, { id, gigId }) => {
      qc.invalidateQueries({ queryKey: [KEY, id] });
      qc.invalidateQueries({ queryKey: [KEY, "gig", gigId] });
    },
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
      apiFetch<InvoiceLineItem>("POST", `/invoices/${invoiceId}/line-items`, input),
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
      apiFetch<InvoiceAdditionalCharge>("POST", `/invoices/${invoiceId}/additional-charges`, input),
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
    }) => apiFetch<InvoicePaymentMade>("POST", `/invoices/${invoiceId}/payments-made`, input),
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

export function useUpdateLineItem() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ invoiceId, itemId, input }: { invoiceId: number; itemId: number; input: UpdateInvoiceLineItemRequest }) =>
      apiFetch<InvoiceLineItem>("PUT", `/invoices/${invoiceId}/line-items/${itemId}`, input),
    onSuccess: (_data, { invoiceId }) =>
      qc.invalidateQueries({ queryKey: [KEY, invoiceId] }),
    successMessage: "Line item updated",
  });
}

export function useUpdateAdditionalCharge() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ invoiceId, chargeId, input }: { invoiceId: number; chargeId: number; input: UpdateInvoiceAdditionalChargeRequest }) =>
      apiFetch<InvoiceAdditionalCharge>("PUT", `/invoices/${invoiceId}/additional-charges/${chargeId}`, input),
    onSuccess: (_data, { invoiceId }) =>
      qc.invalidateQueries({ queryKey: [KEY, invoiceId] }),
    successMessage: "Charge updated",
  });
}

export function useUpdatePaymentMade() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ invoiceId, paymentMadeId, input }: { invoiceId: number; paymentMadeId: number; input: UpdateInvoicePaymentMadeRequest }) =>
      apiFetch<InvoicePaymentMade>("PUT", `/invoices/${invoiceId}/payments-made/${paymentMadeId}`, input),
    onSuccess: (_data, { invoiceId }) =>
      qc.invalidateQueries({ queryKey: [KEY, invoiceId] }),
    successMessage: "Payment updated",
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

/** Link a gig payment to a specific invoice. */
export function useLinkPayment() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ invoiceId, paymentId }: { invoiceId: number; paymentId: number; gigId: number }) =>
      apiFetch<void>("POST", `/invoices/${invoiceId}/link-payment`, { paymentId }),
    onSuccess: (_data, { invoiceId, gigId }) => {
      qc.invalidateQueries({ queryKey: [KEY, invoiceId] });
      qc.invalidateQueries({ queryKey: ["payments", gigId] });
    },
    successMessage: "Payment linked to invoice",
  });
}

/** Unlink a gig payment from a specific invoice. */
export function useUnlinkPayment() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ invoiceId, paymentId }: { invoiceId: number; paymentId: number; gigId: number }) =>
      apiFetch<void>("DELETE", `/invoices/${invoiceId}/link-payment/${paymentId}`),
    onSuccess: (_data, { invoiceId, gigId }) => {
      qc.invalidateQueries({ queryKey: [KEY, invoiceId] });
      qc.invalidateQueries({ queryKey: ["payments", gigId] });
    },
    successMessage: "Payment unlinked",
  });
}

/** Generate a receipt PDF for a saved invoice. Returns a blob object URL. */
export function useGenerateReceipt() {
  return useApiMutation({
    mutationFn: async (invoiceId: number) => {
      const blob = await apiFetchBlob("POST", `/invoices/${invoiceId}/generate-receipt`);
      return URL.createObjectURL(blob);
    },
  });
}
