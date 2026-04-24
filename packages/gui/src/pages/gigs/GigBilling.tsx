import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useGig,
  useUpdateGig,
  useAddGigLineItem,
  useRemoveGigLineItem,
  useGenerateLineItems,
} from "../../api/hooks/useGigs.js";
import { useGigPayments, useCreatePayment, useDeletePayment } from "../../api/hooks/usePayments.js";
import {
  useCreateInvoice,
  useGigInvoices,
  useInvoicePreview,
  useSavedInvoicePdf,
  useDeleteInvoice,
  useLinkPayment,
  useUnlinkPayment,
  useGenerateReceipt,
} from "../../api/hooks/useInvoices.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import Modal from "../../components/Modal.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import { penniesToPounds, poundsToPennies } from "../../utils/money.js";
import type { CreatePaymentRequest, CreateGigLineItemRequest, Invoice } from "@get-down/shared";

export default function GigBilling() {
  const { id } = useParams<{ id: string }>();
  const gigId = Number(id);

  const { data: gig, isLoading, error } = useGig(gigId);
  const { data: payments } = useGigPayments(gigId);
  const { data: invoices } = useGigInvoices(gigId);

  const updateGig = useUpdateGig();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const addGigLineItem = useAddGigLineItem();
  const removeGigLineItem = useRemoveGigLineItem();
  const generateLineItems = useGenerateLineItems();
  const createInvoice = useCreateInvoice();
  const previewMutation = useInvoicePreview();
  const savedPdfMutation = useSavedInvoicePdf();
  const deleteInvoice = useDeleteInvoice();
  const linkPayment = useLinkPayment();
  const unlinkPayment = useUnlinkPayment();
  const generateReceipt = useGenerateReceipt();

  // Billing settings inline editing
  const [editingBilling, setEditingBilling] = useState(false);
  const [billingForm, setBillingForm] = useState({ travelCost: 0, discountPercent: 0 });

  // Add line item modal
  const [showAddLineItem, setShowAddLineItem] = useState(false);
  const [lineItemForm, setLineItemForm] = useState<CreateGigLineItemRequest>({ description: "", amount: 0 });

  // Add payment modal
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<Omit<CreatePaymentRequest, "gigId">>({ amount: 0 });

  // Invoice preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [previewInvoiceType, setPreviewInvoiceType] = useState<'deposit' | 'balance'>('balance');
  const prevUrlRef = useRef<string | null>(null);

  // Invoice PDF modal
  const [showInvoicePdf, setShowInvoicePdf] = useState(false);
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<number | null>(null);
  const invoicePdfUrlRef = useRef<string | null>(null);

  // Receipt PDF modal
  const [showReceiptPdf, setShowReceiptPdf] = useState(false);
  const [receiptPdfUrl, setReceiptPdfUrl] = useState<string | null>(null);
  const [receiptInvoiceNumber, setReceiptInvoiceNumber] = useState<string>("");
  const [loadingReceiptId, setLoadingReceiptId] = useState<number | null>(null);
  const receiptPdfUrlRef = useRef<string | null>(null);

  // Link payment modal
  const [linkPaymentTarget, setLinkPaymentTarget] = useState<Invoice | null>(null);

  // Delete invoice confirm
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState<{ id: number } | null>(null);

  // Revoke blob URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      if (invoicePdfUrlRef.current) URL.revokeObjectURL(invoicePdfUrlRef.current);
      if (receiptPdfUrlRef.current) URL.revokeObjectURL(receiptPdfUrlRef.current);
    };
  }, []);

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error || !gig) return <main className="container"><ErrorBanner error={error ?? "Gig not found"} /></main>;

  // Compute financial summary fully client-side from live data
  const subtotal = (gig.lineItems ?? []).reduce((sum, li) => sum + (li.amount ?? 0), 0);
  const discountAmount = Math.round(subtotal * gig.discountPercent / 100);
  const billingTotal = subtotal - discountAmount + gig.travelCost;
  const totalPaid = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const depositRequired = Math.round(billingTotal * 0.20);
  const depositPaid = Math.min(totalPaid, depositRequired);
  const balanceAmount = Math.max(0, billingTotal - totalPaid);

  function startEditBilling() {
    setBillingForm({ travelCost: penniesToPounds(gig!.travelCost), discountPercent: gig!.discountPercent });
    setEditingBilling(true);
  }

  async function saveBilling(e: React.FormEvent) {
    e.preventDefault();
    await updateGig.mutateAsync({
      id: gigId,
      input: {
        travelCost: poundsToPennies(billingForm.travelCost),
        discountPercent: billingForm.discountPercent,
      },
    });
    setEditingBilling(false);
  }

  async function handleAddLineItem(e: React.FormEvent) {
    e.preventDefault();
    await addGigLineItem.mutateAsync({
      gigId,
      input: { ...lineItemForm, amount: poundsToPennies(lineItemForm.amount ?? 0) },
    });
    setShowAddLineItem(false);
    setLineItemForm({ description: "", amount: 0 });
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    await createPayment.mutateAsync({
      gigId,
      ...paymentForm,
      amount: poundsToPennies(paymentForm.amount ?? 0),
    });
    setShowAddPayment(false);
    setPaymentForm({ amount: 0 });
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

  async function openInvoicePdf(invoiceId: number) {
    if (invoicePdfUrlRef.current) URL.revokeObjectURL(invoicePdfUrlRef.current);
    setInvoicePdfUrl(null);
    setLoadingInvoiceId(invoiceId);
    setShowInvoicePdf(true);
    try {
      const url = await savedPdfMutation.mutateAsync(invoiceId);
      invoicePdfUrlRef.current = url;
      setInvoicePdfUrl(url);
    } catch {
      // error is surfaced via savedPdfMutation.error
    } finally {
      setLoadingInvoiceId(null);
    }
  }

  async function openReceiptPdf(inv: Invoice) {
    if (receiptPdfUrlRef.current) URL.revokeObjectURL(receiptPdfUrlRef.current);
    setReceiptPdfUrl(null);
    setReceiptInvoiceNumber(inv.invoiceNumber);
    setLoadingReceiptId(inv.id);
    setShowReceiptPdf(true);
    try {
      const url = await generateReceipt.mutateAsync(inv.id);
      receiptPdfUrlRef.current = url;
      setReceiptPdfUrl(url);
    } catch {
      // error is surfaced via generateReceipt.error
    } finally {
      setLoadingReceiptId(null);
    }
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

  // Payments not yet linked to any invoice
  const unlinkedPayments = (payments ?? []).filter(p => !p.invoiceId);

  return (
    <main className="container">
      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to="/gigs">Gigs</Link></li>
          <li><Link to={`/gigs/${gigId}`}>{gig.firstName} {gig.lastName}</Link></li>
          <li aria-current="page">Invoice &amp; Billing</li>
        </ul>
      </nav>

      <h1 style={{ marginBottom: "1rem" }}>Invoice &amp; Billing</h1>

      {/* Financial Summary */}
      <article>
        <header><strong>Financial Summary</strong></header>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
          <dt>Quoted Price</dt><dd><MoneyDisplay pennies={gig.totalPrice} /></dd>
          <dt>Subtotal</dt><dd><MoneyDisplay pennies={subtotal} /></dd>
          {gig.discountPercent > 0 && <><dt>Discount ({gig.discountPercent}%)</dt><dd>−<MoneyDisplay pennies={discountAmount} /></dd></>}
          {gig.travelCost > 0 && <><dt>Travel Cost</dt><dd><MoneyDisplay pennies={gig.travelCost} /></dd></>}
          <dt>Billing Total</dt><dd><strong><MoneyDisplay pennies={billingTotal} /></strong></dd>
          <dt>Total Paid</dt><dd><MoneyDisplay pennies={totalPaid} /></dd>
          {billingTotal > 0 && (
            <><dt>Deposit Status</dt><dd>{depositPaid >= depositRequired ? "✓ Deposit paid" : "Deposit not yet paid"}</dd></>
          )}
          <dt>Balance Due</dt><dd><strong><MoneyDisplay pennies={balanceAmount} /></strong></dd>
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
              <FormField label="Travel Cost (£)" type="number" step={0.01} value={billingForm.travelCost} onChange={(e) => setBillingForm((f) => ({ ...f, travelCost: Number(e.target.value) }))} min={0} />
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
                    <button
                      className="contrast outline"
                      style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                      aria-label={`Remove line item: ${item.description ?? "untitled"}`}
                      onClick={() => removeGigLineItem.mutate({ gigId, itemId: item.id })}
                    >✕</button>
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
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Description</th><th>Invoice</th><th aria-label="Actions"></th></tr></thead>
            <tbody>
              {payments.map((p) => {
                const linkedInvoice = p.invoiceId ? (invoices ?? []).find(inv => inv.id === p.invoiceId) : undefined;
                return (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td><MoneyDisplay pennies={p.amount} /></td>
                    <td>{p.method ?? "—"}</td>
                    <td>{p.description ?? "—"}</td>
                    <td style={{ color: linkedInvoice ? undefined : "var(--pico-muted-color)" }}>
                      {linkedInvoice ? linkedInvoice.invoiceNumber : "—"}
                    </td>
                    <td>
                      <button
                        className="contrast outline"
                        style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                        aria-label={`Delete payment of ${p.amount}p`}
                        onClick={() => deletePayment.mutate({ id: p.id, gigId })}
                      >✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No payments recorded.</p>}
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
                          onClick={() => openInvoicePdf(inv.id)}
                          aria-busy={loadingInvoiceId === inv.id}
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
                          aria-busy={loadingReceiptId === inv.id}
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
      <Modal open={showAddLineItem} onClose={() => setShowAddLineItem(false)} title="Add Line Item">
        <form onSubmit={handleAddLineItem}>
          <FormField label="Description" value={lineItemForm.description ?? ""} onChange={(e) => setLineItemForm((f) => ({ ...f, description: e.target.value }))} required placeholder="e.g. 3-piece band" />
          <FormField label="Amount (£)" type="number" step={0.01} value={lineItemForm.amount ?? 0} onChange={(e) => setLineItemForm((f) => ({ ...f, amount: Number(e.target.value) }))} required min={0} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowAddLineItem(false)}>Cancel</button>
            <button type="submit" aria-busy={addGigLineItem.isPending} disabled={addGigLineItem.isPending}>Add</button>
          </footer>
        </form>
      </Modal>

      <Modal open={showAddPayment} onClose={() => setShowAddPayment(false)} title="Add Payment">
        <form onSubmit={handleAddPayment}>
          <FormField label="Amount (£)" type="number" step={0.01} value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: Number(e.target.value) }))} required min={0} />
          <FormField label="Date" type="date" value={toInputDate(paymentForm.date)} onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))} />
          <FormField label="Method" value={paymentForm.method ?? ""} onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))} placeholder="e.g. Bank transfer" />
          <FormField label="Description" value={paymentForm.description ?? ""} onChange={(e) => setPaymentForm((f) => ({ ...f, description: e.target.value }))} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowAddPayment(false)}>Cancel</button>
            <button type="submit" aria-busy={createPayment.isPending} disabled={createPayment.isPending}>Add</button>
          </footer>
        </form>
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
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="secondary" onClick={() => setShowPreview(false)}>Close</button>
          <button
            onClick={handleSaveInvoice}
            disabled={!previewLoaded || savingInvoice || previewMutation.isPending}
            aria-busy={savingInvoice}
          >
            Save Invoice
          </button>
        </footer>
      </Modal>

      {/* Invoice PDF Modal */}
      <Modal open={showInvoicePdf} onClose={() => setShowInvoicePdf(false)} title="Invoice PDF">
        {savedPdfMutation.isPending && <LoadingState />}
        {savedPdfMutation.error && <ErrorBanner error={savedPdfMutation.error instanceof Error ? savedPdfMutation.error.message : "Failed to load PDF"} />}
        {invoicePdfUrl && (
          <iframe
            src={invoicePdfUrl}
            title="Invoice PDF"
            style={{ width: "100%", height: "70vh", border: "none", display: "block" }}
          />
        )}
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="secondary" onClick={() => setShowInvoicePdf(false)}>Close</button>
          {invoicePdfUrl && (
            <a href={invoicePdfUrl} download="invoice.pdf">Download PDF</a>
          )}
        </footer>
      </Modal>

      {/* Receipt PDF Modal */}
      <Modal open={showReceiptPdf} onClose={() => setShowReceiptPdf(false)} title="Receipt PDF">
        {generateReceipt.isPending && <LoadingState />}
        {generateReceipt.error && <ErrorBanner error={generateReceipt.error instanceof Error ? generateReceipt.error.message : "Failed to generate receipt"} />}
        {receiptPdfUrl && (
          <iframe
            src={receiptPdfUrl}
            title="Receipt PDF"
            style={{ width: "100%", height: "70vh", border: "none", display: "block" }}
          />
        )}
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="secondary" onClick={() => setShowReceiptPdf(false)}>Close</button>
          {receiptPdfUrl && (
            <a href={receiptPdfUrl} download={`receipt-${receiptInvoiceNumber}.pdf`}>Download PDF</a>
          )}
        </footer>
      </Modal>

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
    </main>
  );
}
