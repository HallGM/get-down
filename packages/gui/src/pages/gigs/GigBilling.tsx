import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGig,
  useUpdateGig,
  useAddGigLineItem,
  useRemoveGigLineItem,
  useUpdateGigLineItem,
  useGenerateLineItems,
} from "../../api/hooks/useGigs.js";
import { useGigPayments, useCreatePayment, useUpdatePayment, useDeletePayment } from "../../api/hooks/usePayments.js";
import { useGigRefunds, useCreateRefund, useUpdateRefund, useDeleteRefund, useGenerateCreditNote } from "../../api/hooks/useRefunds.js";
import {
  useCreateInvoice,
  useGigInvoices,
  useInvoicePreview,
  useSavedInvoicePdf,
  useDeleteInvoice,
  useLinkPayment,
  useUnlinkPayment,
  useGenerateReceipt,
  useGigAdditionalCharges,
  useAddAdditionalCharge,
  useRemoveAdditionalCharge,
  useUpdateAdditionalCharge,
} from "../../api/hooks/useInvoices.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import MoneyField from "../../components/MoneyField.js";
import Modal from "../../components/Modal.js";
import ModalFooter from "../../components/ModalFooter.js";
import PaymentRefundFormFields, { type PaymentRefundFormState } from "../../components/PaymentRefundFormFields.js";
import UnavailableMoney from "../../components/UnavailableMoney.js";
import { useAccounts, useReceivedByAccounts } from "../../api/hooks/useAccounts.js";
import EditPaymentModal from "../../components/EditPaymentModal.js";
import EditRefundModal from "../../components/EditRefundModal.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import { formatPennies } from "../../utils/money.js";
import { confirmedProfit } from "./gigUtils.js";
import useEditTarget from "../../hooks/useEditTarget.js";
import type { CreateGigLineItemRequest, UpdateGigLineItemRequest, Invoice, InvoiceAdditionalCharge, Payment, Refund, UpdatePaymentRequest, UpdateRefundRequest } from "@get-down/shared";
import { calcBillingTotals, REFUND_SUBTYPE_DEFAULT, isCreditSubtype, isRefundSubtype } from "@get-down/shared";

// ---------------------------------------------------------------------------
// Local hook: manages a single PDF blob modal (load → display → revoke on close)
// ---------------------------------------------------------------------------
function usePdfModal(generateFn: (id: number) => Promise<string>) {
  const [show, setShow] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const urlRef = useRef<string | null>(null);

  const open = useCallback(async (id: number) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    setUrl(null);
    setError(null);
    setLoadingId(id);
    setShow(true);
    try {
      const newUrl = await generateFn(id);
      urlRef.current = newUrl;
      setUrl(newUrl);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to generate PDF"));
    } finally {
      setLoadingId(null);
    }
  }, [generateFn]);

  const close = useCallback(() => setShow(false), []);

  const cleanup = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  return { show, url, loadingId, error, open, close, cleanup };
}

// ---------------------------------------------------------------------------
// Shared modal for adding a payment or refund (identical fields)
// ---------------------------------------------------------------------------
interface AddTransactionModalProps {
  open: boolean;
  title: string;
  form: PaymentRefundFormState;
  onChange: React.Dispatch<React.SetStateAction<PaymentRefundFormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
  isPending: boolean;
  /** When provided, shows a "Received by" dropdown for partner selection. */
  partnerAccounts?: { id: number; personName: string }[];
  /** When true, shows the refund subtype radio group. */
  showSubtype?: boolean;
}

function AddTransactionModal({ open, title, form, onChange, onSubmit, onClose, isPending, partnerAccounts, showSubtype }: AddTransactionModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={onSubmit}>
        <PaymentRefundFormFields
          form={{ ...form, date: toInputDate(form.date) }}
          setForm={onChange}
          accounts={partnerAccounts}
          showSubtype={showSubtype}
        />
        <ModalFooter>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" aria-busy={isPending} disabled={isPending}>Add</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Shared modal for adding or editing a line item
// ---------------------------------------------------------------------------
interface LineItemFormModalProps {
  open: boolean;
  title: string;
  submitLabel: string;
  form: { description?: string; amount?: number };
  onChange: (form: { description?: string; amount?: number }) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
  isPending: boolean;
  error?: Error | null;
}

function LineItemFormModal({ open, title, submitLabel, form, onChange, onSubmit, onClose, isPending, error }: LineItemFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={onSubmit}>
        <FormField label="Description" value={form.description ?? ""} onChange={(e) => onChange({ ...form, description: e.target.value })} required placeholder="e.g. 3-piece band" />
        <MoneyField label="Amount" value={form.amount ?? undefined} onChange={(pennies) => onChange({ ...form, amount: pennies ?? 0 })} required min={0} />
        {error && <ErrorBanner error={error.message} />}
        <ModalFooter>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" aria-busy={isPending} disabled={isPending}>{submitLabel}</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function GigBilling() {
  const { id } = useParams<{ id: string }>();
  const gigId = Number(id);
  const navigate = useNavigate();

  const { data: gig, isLoading, error } = useGig(gigId);
  const { data: payments } = useGigPayments(gigId);
  const { data: invoices } = useGigInvoices(gigId);
  const { data: refunds } = useGigRefunds(gigId);

  const updateGig = useUpdateGig();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const createRefund = useCreateRefund();
  const updateRefund = useUpdateRefund();
  const deleteRefund = useDeleteRefund();
  const generateCreditNoteMutation = useGenerateCreditNote();
  const addGigLineItem = useAddGigLineItem();
  const removeGigLineItem = useRemoveGigLineItem();
  const updateGigLineItem = useUpdateGigLineItem();
  const generateLineItems = useGenerateLineItems();
  const createInvoice = useCreateInvoice();
  const previewMutation = useInvoicePreview();
  const savedPdfMutation = useSavedInvoicePdf();
  const deleteInvoice = useDeleteInvoice();
  const linkPayment = useLinkPayment();
  const unlinkPayment = useUnlinkPayment();
  const generateReceiptMutation = useGenerateReceipt();
  const addAdditionalCharge = useAddAdditionalCharge();
  const removeAdditionalCharge = useRemoveAdditionalCharge();
  const updateAdditionalCharge = useUpdateAdditionalCharge();
  const { data: additionalCharges } = useGigAdditionalCharges(gigId);

  // PDF modals
  const creditNoteModal = usePdfModal(useCallback((id) => generateCreditNoteMutation.mutateAsync(id), [generateCreditNoteMutation]));
  const invoicePdfModal = usePdfModal(useCallback((id) => savedPdfMutation.mutateAsync(id), [savedPdfMutation]));
  const receiptModal    = usePdfModal(useCallback((id) => generateReceiptMutation.mutateAsync(id), [generateReceiptMutation]));

  // Receipt modal also needs the invoice number for the download filename
  const [receiptInvoiceNumber, setReceiptInvoiceNumber] = useState<string>("");

  // Billing settings inline editing
  const [editingBilling, setEditingBilling] = useState(false);
  const [billingForm, setBillingForm] = useState({ travelCost: 0, discountPercent: 0 });

  // Add line item modal
  const [showAddLineItem, setShowAddLineItem] = useState(false);
  const [lineItemForm, setLineItemForm] = useState<CreateGigLineItemRequest>({ description: "", amount: 0 });

  // Edit line item modal
  const [editLineItemId, setEditLineItemId] = useState<number | null>(null);
  const [editLineItemForm, setEditLineItemForm] = useState<UpdateGigLineItemRequest>({ description: "", amount: 0 });

  // Additional charge modals
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [addChargeForm, setAddChargeForm] = useState<{ invoiceId: number | null; description: string; amount: number }>({ invoiceId: null, description: "", amount: 0 });
  const [editChargeId, setEditChargeId] = useState<number | null>(null);
  const [editChargeForm, setEditChargeForm] = useState<{ description?: string; amount?: number }>({ description: "", amount: 0 });

  const { data: accounts = [] } = useAccounts();
  const { data: receivedByAccounts = [] } = useReceivedByAccounts();
  const accountNameById = new Map(accounts.map((a) => [a.id, a.personName]));

  // Add payment / refund modals
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentRefundFormState>({ amount: 0, date: "", method: "", description: "", receivedByAccountId: null });

  const [showAddRefund, setShowAddRefund] = useState(false);
  const [refundForm, setRefundForm] = useState<PaymentRefundFormState>({ amount: 0, date: "", method: "", description: "", subtype: REFUND_SUBTYPE_DEFAULT });

  // Edit payment / refund modals
  const editPayment = useEditTarget<Payment, UpdatePaymentRequest>(updatePayment);
  const editRefund = useEditTarget<Refund, UpdateRefundRequest>(updateRefund);

  // Invoice preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [previewInvoiceType, setPreviewInvoiceType] = useState<'deposit' | 'balance'>('balance');
  const prevUrlRef = useRef<string | null>(null);

  // Link payment modal
  const [linkPaymentTarget, setLinkPaymentTarget] = useState<Invoice | null>(null);

  // Delete invoice confirm
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState<{ id: number } | null>(null);

  // Revoke blob URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      creditNoteModal.cleanup();
      invoicePdfModal.cleanup();
      receiptModal.cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingState />;
  if (error || !gig) return <ErrorBanner error={error ?? "Gig not found"} />;

  // Compute financial summary fully client-side from live data
  const subtotal      = (gig.lineItems ?? []).reduce((sum, li) => sum + (li.amount ?? 0), 0);
  const totalCredits  = (refunds ?? []).filter(r => isCreditSubtype(r.subtype)).reduce((sum, r) => sum + r.amount, 0);
  const totalPaid     = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = (refunds ?? []).filter(r => isRefundSubtype(r.subtype)).reduce((sum, r) => sum + r.amount, 0);
  const { discountAmount, billingTotal, netReceived, depositRequired, depositPaid, balanceAmount } = calcBillingTotals({
    subtotal,
    discountPercent: gig.discountPercent,
    travelCost:      gig.travelCost,
    totalCredits,
    totalPaid,
    totalRefunded,
    totalAdditionalCharges: gig.totalAdditionalCharges ?? 0,
  });

  function startEditBilling() {
    setBillingForm({ travelCost: gig!.travelCost, discountPercent: gig!.discountPercent });
    setEditingBilling(true);
  }

  async function saveBilling(e: React.FormEvent) {
    e.preventDefault();
    await updateGig.mutateAsync({
      id: gigId,
      input: {
        travelCost: billingForm.travelCost,
        discountPercent: billingForm.discountPercent,
      },
    });
    setEditingBilling(false);
  }

  async function handleAddLineItem(e: React.FormEvent) {
    e.preventDefault();
    await addGigLineItem.mutateAsync({
      gigId,
      input: { ...lineItemForm, amount: lineItemForm.amount ?? 0 },
    });
    setShowAddLineItem(false);
    setLineItemForm({ description: "", amount: 0 });
  }

  function openEditLineItem(item: { id: number; description?: string; amount?: number }) {
    setEditLineItemId(item.id);
    setEditLineItemForm({ description: item.description ?? "", amount: item.amount });
  }

  function closeEditLineItem() {
    setEditLineItemId(null);
    setEditLineItemForm({ description: "", amount: 0 });
  }

  async function handleEditLineItem(e: React.FormEvent) {
    e.preventDefault();
    if (editLineItemId === null) return;
    await updateGigLineItem.mutateAsync({
      gigId,
      itemId: editLineItemId,
      input: { ...editLineItemForm, amount: editLineItemForm.amount ?? 0 },
    });
    closeEditLineItem();
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    await createPayment.mutateAsync({ gigId, ...paymentForm, amount: paymentForm.amount ?? 0 });
    setShowAddPayment(false);
    setPaymentForm({ amount: 0, date: "", method: "", description: "", receivedByAccountId: null });
  }

  async function handleAddRefund(e: React.FormEvent) {
    e.preventDefault();
    await createRefund.mutateAsync({ gigId, ...refundForm, amount: refundForm.amount ?? 0 });
    setShowAddRefund(false);
    setRefundForm({ amount: 0, date: "", method: "", description: "", subtype: REFUND_SUBTYPE_DEFAULT });
  }

  async function openPreview(invoiceType: 'deposit' | 'balance') {
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    setPreviewUrl(null);
    setPreviewLoaded(false);
    setPreviewInvoiceType(invoiceType);
    setShowPreview(true);
    try {
      const url = await previewMutation.mutateAsync({ gigId, invoiceType });
      prevUrlRef.current = url;
      setPreviewUrl(url);
    } catch {
      // error is surfaced via previewMutation.error
    }
  }

  async function handleSaveInvoice() {
    setSavingInvoice(true);
    try {
      await createInvoice.mutateAsync({ gigId, invoiceType: previewInvoiceType });
      setShowPreview(false);
    } finally {
      setSavingInvoice(false);
    }
  }

  function openReceiptPdf(inv: Invoice) {
    setReceiptInvoiceNumber(inv.invoiceNumber);
    receiptModal.open(inv.id);
  }

  async function handleDeleteInvoice() {
    if (!deleteInvoiceTarget) return;
    await deleteInvoice.mutateAsync({ id: deleteInvoiceTarget.id, gigId });
    setDeleteInvoiceTarget(null);
  }

  async function handleLinkPayment(paymentId: number) {
    if (!linkPaymentTarget) return;
    await linkPayment.mutateAsync({ invoiceId: linkPaymentTarget.id, paymentId, gigId });
  }

  async function handleUnlinkPayment(invoiceId: number, paymentId: number) {
    await unlinkPayment.mutateAsync({ invoiceId, paymentId, gigId });
  }

  async function handleAddCharge(e: React.FormEvent) {
    e.preventDefault();
    if (addChargeForm.invoiceId === null) return;
    await addAdditionalCharge.mutateAsync({
      invoiceId: addChargeForm.invoiceId,
      gigId,
      input: { description: addChargeForm.description, amount: addChargeForm.amount },
    });
    setShowAddCharge(false);
    setAddChargeForm({ invoiceId: null, description: "", amount: 0 });
  }

  function openEditCharge(charge: InvoiceAdditionalCharge) {
    setEditChargeId(charge.id);
    setEditChargeForm({ description: charge.description ?? "", amount: charge.amount ?? 0 });
  }

  function closeEditCharge() {
    setEditChargeId(null);
    setEditChargeForm({ description: "", amount: 0 });
  }

  async function handleEditCharge(e: React.FormEvent) {
    e.preventDefault();
    if (editChargeId === null) return;
    const charge = additionalCharges?.find(c => c.id === editChargeId);
    if (!charge) return;
    await updateAdditionalCharge.mutateAsync({
      invoiceId: charge.invoiceId,
      chargeId: editChargeId,
      gigId,
      input: { description: editChargeForm.description, amount: editChargeForm.amount },
    });
    closeEditCharge();
  }

  // Payments not yet linked to any invoice
  const unlinkedPayments = (payments ?? []).filter(p => !p.invoiceId);

  return (
    <>
      {/* Financial Summary */}
      <article>
        <header><strong>Financial Summary</strong></header>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
          <dt>Quoted Price</dt><dd><MoneyDisplay pennies={gig.totalPrice} /></dd>
          <dt>Subtotal</dt><dd><MoneyDisplay pennies={subtotal} /></dd>
          {gig.discountPercent > 0 && <><dt>Discount ({gig.discountPercent}%)</dt><dd>−<MoneyDisplay pennies={discountAmount} /></dd></>}
          {gig.travelCost > 0 && <><dt>Travel Cost</dt><dd><MoneyDisplay pennies={gig.travelCost} /></dd></>}
          {totalCredits > 0 && <><dt>Credits applied</dt><dd>−<MoneyDisplay pennies={totalCredits} /></dd></>}
          {(gig.totalAdditionalCharges ?? 0) > 0 && <><dt>Surcharges</dt><dd><MoneyDisplay pennies={gig.totalAdditionalCharges!} /></dd></>}
          <dt>Billing Total</dt><dd><strong><MoneyDisplay pennies={billingTotal} /></strong></dd>
          <dt>Total Paid</dt><dd><MoneyDisplay pennies={totalPaid} /></dd>
          {totalRefunded > 0 && <><dt>Total Refunded</dt><dd>−<MoneyDisplay pennies={totalRefunded} /></dd></>}
          {totalRefunded > 0 && <><dt>Net Received</dt><dd><MoneyDisplay pennies={netReceived} /></dd></>}
          {billingTotal > 0 && (
            <><dt>Deposit Status</dt><dd>{depositPaid >= depositRequired ? "✓ Deposit paid" : "Deposit not yet paid"}</dd></>
          )}
          <dt>Balance Due</dt><dd><strong><MoneyDisplay pennies={balanceAmount} /></strong></dd>
          {gig.status !== "cancelled" && (
            <>
              <dt>Predicted profit</dt>
              <dd>
                {gig.predictedProfit == null
                  ? <UnavailableMoney />
                  : <MoneyDisplay pennies={gig.predictedProfit} />}
              </dd>
            </>
          )}
          {gig.settled && (
            <>
              <dt>Confirmed profit</dt>
              <dd><MoneyDisplay pennies={confirmedProfit(gig)} /></dd>
            </>
          )}
        </dl>
      </article>

      {/* Billing Settings */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Billing Settings</h2>
          {!editingBilling && <button className="secondary" onClick={startEditBilling}>Edit</button>}
        </div>
        {!editingBilling ? (
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
            <dt>Travel Cost</dt><dd><MoneyDisplay pennies={gig.travelCost} /></dd>
            <dt>Discount</dt><dd>{gig.discountPercent}%</dd>
          </dl>
        ) : (
          <form onSubmit={saveBilling}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              <MoneyField label="Travel Cost" value={billingForm.travelCost} onChange={(pennies) => setBillingForm((f) => ({ ...f, travelCost: pennies ?? 0 }))} min={0} />
              <FormField label="Discount (%)" type="number" value={billingForm.discountPercent} onChange={(e) => setBillingForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))} min={0} max={100} />
            </div>
            {updateGig.error && <ErrorBanner error={updateGig.error instanceof Error ? updateGig.error.message : "Failed to save billing settings"} />}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="submit" aria-busy={updateGig.isPending} disabled={updateGig.isPending}>Save</button>
              <button type="button" className="secondary" onClick={() => setEditingBilling(false)}>Cancel</button>
            </div>
          </form>
        )}
      </section>

      {/* Line Items */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Line Items</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="secondary outline"
              onClick={() => generateLineItems.mutate(gigId)}
              disabled={!gig.services?.length || generateLineItems.isPending}
              aria-busy={generateLineItems.isPending}
            >
              Generate from Services
            </button>
            <button className="secondary" onClick={() => setShowAddLineItem(true)}>+ Add</button>
          </div>
        </div>
        {gig.lineItems && gig.lineItems.length > 0 ? (
          <table>
            <thead><tr><th>Description</th><th>Amount</th><th aria-label="Actions"></th></tr></thead>
            <tbody>
              {gig.lineItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.description ?? "—"}</td>
                  <td><MoneyDisplay pennies={item.amount} /></td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        className="secondary outline"
                        style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                        aria-label={`Edit line item: ${item.description ?? "untitled"}`}
                        onClick={() => openEditLineItem(item)}
                      >✏️</button>
                      <button
                        className="contrast outline"
                        style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                        aria-label={`Remove line item: ${item.description ?? "untitled"}`}
                        onClick={() => removeGigLineItem.mutate({ gigId, itemId: item.id })}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No line items. Add items to define what this gig will be billed for.</p>}
      </section>

      {/* Payments */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Payments</h2>
          <button className="secondary" onClick={() => setShowAddPayment(true)}>+ Add</button>
        </div>
        {payments && payments.length > 0 ? (
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Description</th><th>Invoice</th><th>Received by</th><th aria-label="Actions"></th></tr></thead>
            <tbody>
              {payments.map((p) => {
                const linkedInvoice = p.invoiceId ? (invoices ?? []).find(inv => inv.id === p.invoiceId) : undefined;
                const receivedByName = p.receivedByAccountId ? accountNameById.get(p.receivedByAccountId) : undefined;
                return (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td><MoneyDisplay pennies={p.amount} /></td>
                    <td>{p.method ?? "—"}</td>
                    <td>{p.description ?? "—"}</td>
                    <td style={{ color: linkedInvoice ? undefined : "var(--pico-muted-color)" }}>
                      {linkedInvoice ? linkedInvoice.invoiceNumber : "—"}
                    </td>
                    <td style={{ color: receivedByName ? "inherit" : "var(--pico-muted-color)" }}>
                      {receivedByName ?? "Not set"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className="secondary outline"
                          style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                          aria-label={`Edit payment of ${formatPennies(p.amount)}`}
                          onClick={() => editPayment.setTarget(p)}
                        >✏️</button>
                        <button
                          className="contrast outline"
                          style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                          aria-label={`Delete payment of ${formatPennies(p.amount)}`}
                          onClick={() => deletePayment.mutate({ id: p.id, gigId })}
                        >✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No payments recorded.</p>}
      </section>

      {/* Refunds */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Refunds</h2>
          <button className="secondary" onClick={() => setShowAddRefund(true)}>+ Add</button>
        </div>
        {refunds && refunds.length > 0 ? (
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Description</th><th>Type</th><th aria-label="Actions"></th></tr></thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.date)}</td>
                  <td><MoneyDisplay pennies={r.amount} /></td>
                  <td>{r.method ?? "—"}</td>
                  <td>{r.description ?? "—"}</td>
                  <td>
                    {r.subtype === 'write_off'
                      ? <span>Write-off <small>(debt forgiven)</small></span>
                      : r.subtype === 'credit'
                      ? <span>Credit <small>(goodwill gesture)</small></span>
                      : <span>Adjustment <small>(overpayment correction)</small></span>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        className="secondary outline"
                        style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                        aria-label={`Edit refund of ${formatPennies(r.amount)}`}
                        onClick={() => editRefund.setTarget(r)}
                      >✏️</button>
                      <button
                        className="secondary outline"
                        style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                        aria-busy={creditNoteModal.loadingId === r.id}
                          aria-label={`Generate credit note for refund of ${formatPennies(r.amount)}`}
                          title="Generate credit note PDF"
                          onClick={() => creditNoteModal.open(r.id)}
                      >CN</button>
                      <button
                        className="contrast outline"
                        style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                        aria-label={`Delete refund of ${formatPennies(r.amount)}`}
                        onClick={() => deleteRefund.mutate({ id: r.id, gigId })}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No refunds recorded.</p>}
      </section>

      {/* Additional Charges */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Additional Charges</h2>
          <button
            className="secondary"
            onClick={() => setShowAddCharge(true)}
            disabled={!invoices?.length}
            title={!invoices?.length ? "Create an invoice first" : undefined}
          >+ Add</button>
        </div>
        {additionalCharges && additionalCharges.length > 0 ? (
          <table>
            <thead><tr><th>Invoice</th><th>Description</th><th>Amount</th><th aria-label="Actions"></th></tr></thead>
            <tbody>
              {additionalCharges.map((c) => (
                <tr key={c.id}>
                  <td>{c.invoiceNumber ?? "—"}</td>
                  <td>{c.description ?? "—"}</td>
                  <td><MoneyDisplay pennies={c.amount ?? 0} /></td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        className="secondary outline"
                        style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                        aria-label={`Edit charge: ${c.description ?? "untitled"}`}
                        onClick={() => openEditCharge(c)}
                      >✏️</button>
                      <button
                        className="contrast outline"
                        style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                        aria-label={`Remove charge: ${c.description ?? "untitled"}`}
                        onClick={() => removeAdditionalCharge.mutate({ invoiceId: c.invoiceId, chargeId: c.id, gigId })}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No additional charges. Add a surcharge, processing fee, or other item.</p>}
      </section>

      {/* Invoices */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Invoices</h2>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="secondary outline"
                onClick={() => openPreview('deposit')}
                disabled={!gig.lineItems?.length}
                title={!gig.lineItems?.length ? "Add line items before generating an invoice" : undefined}
              >
                Deposit Invoice
              </button>
              <button
                onClick={() => openPreview('balance')}
                disabled={!gig.lineItems?.length}
                title={!gig.lineItems?.length ? "Add line items before generating an invoice" : undefined}
              >
                Balance Invoice
              </button>
            </div>
            {!gig.lineItems?.length && (
              <small style={{ color: "var(--pico-muted-color)" }}>Add line items first</small>
            )}
          </div>
        </div>
        {invoices && invoices.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Type</th>
                <th>Total</th>
                <th>Amount Due</th>
                <th>Linked Payments</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const invPayments = (payments ?? []).filter(p => p.invoiceId === inv.id);
                const hasLinkedPayments = invPayments.length > 0;
                return (
                  <tr key={inv.id}>
                    <td>{inv.invoiceNumber}</td>
                    <td>{formatDate(inv.date)}</td>
                    <td style={{ textTransform: "capitalize" }}>{inv.invoiceType}</td>
                    <td><MoneyDisplay pennies={inv.totalAmount} /></td>
                    <td><MoneyDisplay pennies={inv.amountDue} /></td>
                    <td>
                      {invPayments.length > 0 ? (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {invPayments.map(p => (
                            <li key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                              <span style={{ fontSize: "0.85em" }}>
                                {formatDate(p.date)} — <MoneyDisplay pennies={p.amount} />
                              </span>
                              <button
                                className="contrast outline"
                                style={{ padding: "0.15em 0.4em", fontSize: "0.75em", minWidth: "unset", minHeight: "unset" }}
                                aria-label={`Unlink payment from invoice ${inv.invoiceNumber}`}
                                onClick={() => handleUnlinkPayment(inv.id, p.id)}
                                disabled={unlinkPayment.isPending}
                              >✕</button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ color: "var(--pico-muted-color)", fontSize: "0.85em" }}>None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                        <button
                          className="secondary outline"
                          style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                          onClick={() => navigate(`/gigs/${gigId}/invoices/${inv.id}/edit`)}
                          aria-label={`Edit invoice ${inv.invoiceNumber}`}
                          title="Edit invoice"
                        >✏️</button>
                        <button
                          className="secondary outline"
                          style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                          onClick={() => invoicePdfModal.open(inv.id)}
                          aria-busy={invoicePdfModal.loadingId === inv.id}
                          aria-label={`Open PDF for invoice ${inv.invoiceNumber}`}
                        >PDF</button>
                        <button
                          className="secondary outline"
                          style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                          onClick={() => setLinkPaymentTarget(inv)}
                          aria-label={`Link payment to invoice ${inv.invoiceNumber}`}
                          disabled={unlinkedPayments.length === 0}
                          title={unlinkedPayments.length === 0 ? "No unlinked payments available" : "Link a payment to this invoice"}
                        >Link</button>
                        <button
                          className="secondary outline"
                          style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                          onClick={() => openReceiptPdf(inv)}
                          aria-busy={receiptModal.loadingId === inv.id}
                          aria-label={`Generate receipt for invoice ${inv.invoiceNumber}`}
                          disabled={!hasLinkedPayments}
                          title={!hasLinkedPayments ? "Link at least one payment to generate a receipt" : "Generate receipt PDF"}
                        >Receipt</button>
                        <button
                          className="contrast outline"
                          style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                          aria-label={`Delete invoice ${inv.invoiceNumber}`}
                          onClick={() => setDeleteInvoiceTarget({ id: inv.id })}
                        >✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No invoices yet. Use the buttons above to generate one.</p>}
      </section>

      {/* Modals */}
      <LineItemFormModal
        open={showAddLineItem}
        title="Add Line Item"
        submitLabel="Add"
        form={lineItemForm}
        onChange={(f) => setLineItemForm(f)}
        onSubmit={handleAddLineItem}
        onClose={() => setShowAddLineItem(false)}
        isPending={addGigLineItem.isPending}
      />

      <LineItemFormModal
        open={editLineItemId !== null}
        title="Edit Line Item"
        submitLabel="Save"
        form={editLineItemForm}
        onChange={(f) => setEditLineItemForm(f)}
        onSubmit={handleEditLineItem}
        onClose={closeEditLineItem}
        isPending={updateGigLineItem.isPending}
        error={updateGigLineItem.error}
      />

      <AddTransactionModal
        open={showAddPayment}
        title="Add Payment"
        form={paymentForm}
        onChange={setPaymentForm}
        onSubmit={handleAddPayment}
        onClose={() => setShowAddPayment(false)}
        isPending={createPayment.isPending}
        partnerAccounts={receivedByAccounts}
      />

      <AddTransactionModal
        open={showAddRefund}
        title="Add Refund"
        form={refundForm}
        onChange={setRefundForm}
        onSubmit={handleAddRefund}
        onClose={() => setShowAddRefund(false)}
        isPending={createRefund.isPending}
        showSubtype
      />

      {/* Credit Note PDF Modal */}
      <Modal open={creditNoteModal.show} onClose={creditNoteModal.close} title="Credit Note PDF">
        {creditNoteModal.loadingId !== null && <LoadingState />}
        {creditNoteModal.error && <ErrorBanner error={creditNoteModal.error.message} />}
        {creditNoteModal.url && (
          <iframe
            src={creditNoteModal.url}
            title="Credit Note PDF"
            style={{ width: "100%", height: "70vh", border: "none", display: "block" }}
          />
        )}
        <ModalFooter>
          <button className="secondary" onClick={creditNoteModal.close}>Close</button>
          {creditNoteModal.url && (
            <a href={creditNoteModal.url} download="credit-note.pdf">Download PDF</a>
          )}
        </ModalFooter>
      </Modal>

      {/* Invoice Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title={`Invoice Preview — ${previewInvoiceType === 'deposit' ? 'Deposit' : 'Balance'}`}>
        {previewMutation.isPending && <LoadingState />}
        {previewMutation.error && <ErrorBanner error={previewMutation.error instanceof Error ? previewMutation.error.message : "Failed to load preview"} />}
        {previewUrl && (
          <iframe
            src={previewUrl}
            title="Invoice Preview"
            onLoad={() => setPreviewLoaded(true)}
            style={{ width: "100%", height: "70vh", border: "none", display: "block" }}
          />
        )}
        <ModalFooter>
          <button className="secondary" onClick={() => setShowPreview(false)}>Close</button>
          <button
            onClick={handleSaveInvoice}
            disabled={!previewLoaded || savingInvoice || previewMutation.isPending}
            aria-busy={savingInvoice}
          >
            Save Invoice
          </button>
        </ModalFooter>
      </Modal>

      {/* Invoice PDF Modal */}
      <Modal open={invoicePdfModal.show} onClose={invoicePdfModal.close} title="Invoice PDF">
        {invoicePdfModal.loadingId !== null && <LoadingState />}
        {invoicePdfModal.error && <ErrorBanner error={invoicePdfModal.error.message} />}
        {invoicePdfModal.url && (
          <iframe
            src={invoicePdfModal.url}
            title="Invoice PDF"
            style={{ width: "100%", height: "70vh", border: "none", display: "block" }}
          />
        )}
        <ModalFooter>
          <button className="secondary" onClick={invoicePdfModal.close}>Close</button>
          {invoicePdfModal.url && (
            <a href={invoicePdfModal.url} download="invoice.pdf">Download PDF</a>
          )}
        </ModalFooter>
      </Modal>

      {/* Receipt PDF Modal */}
      <Modal open={receiptModal.show} onClose={receiptModal.close} title="Receipt PDF">
        {receiptModal.loadingId !== null && <LoadingState />}
        {receiptModal.error && <ErrorBanner error={receiptModal.error.message} />}
        {receiptModal.url && (
          <iframe
            src={receiptModal.url}
            title="Receipt PDF"
            style={{ width: "100%", height: "70vh", border: "none", display: "block" }}
          />
        )}
        <ModalFooter>
          <button className="secondary" onClick={receiptModal.close}>Close</button>
          {receiptModal.url && (
            <a href={receiptModal.url} download={`receipt-${receiptInvoiceNumber}.pdf`}>Download PDF</a>
          )}
        </ModalFooter>
      </Modal>

      {/* Add Additional Charge Modal */}
      <Modal open={showAddCharge} onClose={() => setShowAddCharge(false)} title="Add Additional Charge">
        <form onSubmit={handleAddCharge}>
          <FormField label="Description" value={addChargeForm.description} onChange={(e) => setAddChargeForm(f => ({ ...f, description: e.target.value }))} required placeholder="e.g. Card processing fee" />
          <MoneyField label="Amount" value={addChargeForm.amount} onChange={(pennies) => setAddChargeForm(f => ({ ...f, amount: pennies ?? 0 }))} required min={0} />
          <FormField label="Invoice" as="select" value={addChargeForm.invoiceId ?? ""} onChange={(e) => setAddChargeForm(f => ({ ...f, invoiceId: Number(e.target.value) }))} required>
            <option value="">Select invoice...</option>
            {invoices?.map(inv => (
              <option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>
            ))}
          </FormField>
          {addAdditionalCharge.error && <ErrorBanner error={addAdditionalCharge.error.message} />}
          <ModalFooter>
            <button type="button" className="secondary" onClick={() => setShowAddCharge(false)}>Cancel</button>
            <button type="submit" aria-busy={addAdditionalCharge.isPending} disabled={addAdditionalCharge.isPending || addChargeForm.invoiceId === null}>Add</button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Additional Charge Modal */}
      <LineItemFormModal
        open={editChargeId !== null}
        title="Edit Additional Charge"
        submitLabel="Save"
        form={editChargeForm}
        onChange={(f) => setEditChargeForm(f)}
        onSubmit={handleEditCharge}
        onClose={closeEditCharge}
        isPending={updateAdditionalCharge.isPending}
        error={updateAdditionalCharge.error}
      />

      {/* Link Payment Modal */}
      <Modal
        open={!!linkPaymentTarget}
        onClose={() => setLinkPaymentTarget(null)}
        title={`Link Payment to Invoice ${linkPaymentTarget?.invoiceNumber ?? ""}`}
      >
        {linkPayment.error && <ErrorBanner error={linkPayment.error instanceof Error ? linkPayment.error.message : "Failed to link payment"} />}
        {unlinkedPayments.length === 0 ? (
          <p style={{ color: "var(--pico-muted-color)" }}>No unlinked payments available for this gig.</p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Description</th><th aria-label="Actions"></th></tr></thead>
            <tbody>
              {unlinkedPayments.map(p => (
                <tr key={p.id}>
                  <td>{formatDate(p.date)}</td>
                  <td><MoneyDisplay pennies={p.amount} /></td>
                  <td>{p.method ?? "—"}</td>
                  <td>{p.description ?? "—"}</td>
                  <td>
                    <button
                      className="secondary outline"
                      style={{ padding: "0.5em 0.75em" }}
                      onClick={() => handleLinkPayment(p.id)}
                      disabled={linkPayment.isPending}
                      aria-busy={linkPayment.isPending}
                    >Link</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <footer style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="secondary" onClick={() => setLinkPaymentTarget(null)}>Close</button>
        </footer>
      </Modal>

      <ConfirmDelete
        open={!!deleteInvoiceTarget}
        itemName="this invoice"
        onConfirm={handleDeleteInvoice}
        onCancel={() => setDeleteInvoiceTarget(null)}
        loading={deleteInvoice.isPending}
      />

      <EditPaymentModal
        open={!!editPayment.target}
        payment={editPayment.target}
        accounts={receivedByAccounts}
        onSave={editPayment.handleSave}
        onClose={() => editPayment.setTarget(null)}
        isPending={updatePayment.isPending}
      />

      <EditRefundModal
        open={!!editRefund.target}
        refund={editRefund.target}
        onSave={editRefund.handleSave}
        onClose={() => editRefund.setTarget(null)}
        isPending={updateRefund.isPending}
      />
    </>
  );
}
