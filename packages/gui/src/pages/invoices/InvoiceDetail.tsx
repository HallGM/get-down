import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useInvoice,
  useDeleteInvoice,
  useSavedInvoicePdf,
} from "../../api/hooks/useInvoices.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import { formatDate } from "../../utils/date.js";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const navigate = useNavigate();

  const { data: invoice, isLoading, error } = useInvoice(invoiceId);
  const deleteInvoice = useDeleteInvoice();
  const pdfMutation = useSavedInvoicePdf();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);

  async function openPdf() {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    setPdfUrl(null);
    setShowPdf(true);
    const url = await pdfMutation.mutateAsync(invoiceId);
    pdfUrlRef.current = url;
    setPdfUrl(url);
  }

  async function handleDelete() {
    await deleteInvoice.mutateAsync({ id: invoiceId, gigId: invoice!.gigId });
    navigate(`/gigs/${invoice!.gigId}`);
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error || !invoice) return <main className="container"><ErrorBanner error={error ?? "Invoice not found"} /></main>;

  return (
    <main className="container">
      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to="/gigs">Gigs</Link></li>
          <li><Link to={`/gigs/${invoice.gigId}`}>{invoice.customerName}</Link></li>
          <li>{invoice.invoiceNumber}</li>
        </ul>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        <hgroup>
          <h1>Invoice {invoice.invoiceNumber}</h1>
          <p>{invoice.customerName} · {formatDate(invoice.eventDate)}</p>
        </hgroup>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="secondary" onClick={openPdf} aria-busy={pdfMutation.isPending}>View PDF</button>
          <button className="contrast outline" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
        </div>
      </div>

      <article>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
          <dt>Invoice Date</dt><dd>{formatDate(invoice.date)}</dd>
          <dt>Venue</dt><dd>{invoice.venue ?? "—"}</dd>
          <dt>Subtotal</dt><dd><MoneyDisplay pennies={invoice.subtotalAmount} /></dd>
          <dt>Discount</dt><dd>{invoice.discountPercent}%</dd>
          <dt>Travel</dt><dd><MoneyDisplay pennies={invoice.travelCost} /></dd>
          <dt>Total</dt><dd><strong><MoneyDisplay pennies={invoice.totalAmount} /></strong></dd>
          <dt>Amount Due</dt><dd><strong><MoneyDisplay pennies={invoice.amountDue} /></strong></dd>
        </dl>
      </article>

      {/* Line Items */}
      <section>
        <h2>Line Items</h2>
        <table>
          <thead><tr><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            {(invoice.lineItems ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.description ?? "—"}</td>
                <td><MoneyDisplay pennies={item.amount} /></td>
              </tr>
            ))}
            {!invoice.lineItems?.length && <tr><td colSpan={2} style={{ color: "var(--pico-muted-color)" }}>No line items.</td></tr>}
          </tbody>
        </table>
      </section>

      {/* Additional Charges */}
      <section>
        <h2>Additional Charges</h2>
        <table>
          <thead><tr><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            {(invoice.additionalCharges ?? []).map((c) => (
              <tr key={c.id}>
                <td>{c.description ?? "—"}</td>
                <td><MoneyDisplay pennies={c.amount} /></td>
              </tr>
            ))}
            {!invoice.additionalCharges?.length && <tr><td colSpan={2} style={{ color: "var(--pico-muted-color)" }}>No additional charges.</td></tr>}
          </tbody>
        </table>
      </section>

      {/* Payments Made */}
      <section>
        <h2>Payments Made</h2>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            {(invoice.paymentsMade ?? []).map((p) => (
              <tr key={p.id}>
                <td>{formatDate(p.date)}</td>
                <td>{p.description ?? "—"}</td>
                <td><MoneyDisplay pennies={p.amount} /></td>
              </tr>
            ))}
            {!invoice.paymentsMade?.length && <tr><td colSpan={3} style={{ color: "var(--pico-muted-color)" }}>No payments recorded.</td></tr>}
          </tbody>
        </table>
      </section>

      <ConfirmDelete
        open={showDeleteConfirm}
        itemName={`invoice ${invoice.invoiceNumber}`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleteInvoice.isPending}
      />

      {/* PDF Viewer */}
      <dialog open={showPdf} style={{ maxWidth: "90vw", width: "900px", padding: "1.5rem" }}>
        <article style={{ margin: 0 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Invoice {invoice.invoiceNumber}</strong>
            <button className="secondary outline" style={{ padding: "0.3em 0.7em" }} onClick={() => setShowPdf(false)}>✕</button>
          </header>
          {pdfMutation.isPending && <LoadingState />}
          {pdfMutation.error && <ErrorBanner error={pdfMutation.error instanceof Error ? pdfMutation.error.message : "Failed to load PDF"} />}
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              title={`Invoice ${invoice.invoiceNumber}`}
              style={{ width: "100%", height: "70vh", border: "none", display: "block" }}
            />
          )}
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button className="secondary" onClick={() => setShowPdf(false)}>Close</button>
            {pdfUrl && (
              <a href={pdfUrl} download={`${invoice.invoiceNumber}.pdf`} role="button">Download PDF</a>
            )}
          </footer>
        </article>
      </dialog>
    </main>
  );
}
