import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useGig,
  useUpdateGig,
  useDeleteGig,
  useSetGigServices,
  useAddGigLineItem,
  useRemoveGigLineItem,
  useGenerateLineItems,
} from "../../api/hooks/useGigs.js";
import { useGigPayments, useCreatePayment, useDeletePayment } from "../../api/hooks/usePayments.js";
import { useGigRoles, useCreateRole, useDeleteRole } from "../../api/hooks/useAssignedRoles.js";
import {
  useCreateInvoice,
  useGigInvoices,
  useInvoicePreview,
  useSavedInvoicePdf,
  useDeleteInvoice,
} from "../../api/hooks/useInvoices.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import StatusBadge from "../../components/StatusBadge.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import Modal from "../../components/Modal.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import type { UpdateGigRequest, CreatePaymentRequest, CreateGigLineItemRequest } from "@get-down/shared";

const STATUS_OPTIONS = ["enquiry", "confirmed", "completed", "cancelled", "postponed"];

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const gigId = Number(id);
  const navigate = useNavigate();

  const { data: gig, isLoading, error } = useGig(gigId);
  const { data: payments } = useGigPayments(gigId);
  const { data: roles } = useGigRoles(gigId);
  const { data: invoices } = useGigInvoices(gigId);

  const updateGig = useUpdateGig();
  const deleteGig = useDeleteGig();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const addGigLineItem = useAddGigLineItem();
  const removeGigLineItem = useRemoveGigLineItem();
  const generateLineItems = useGenerateLineItems();
  const createInvoice = useCreateInvoice();
  const previewMutation = useInvoicePreview();
  const savedPdfMutation = useSavedInvoicePdf();
  const deleteInvoice = useDeleteInvoice();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateGigRequest>({});
  const [showDeleteGig, setShowDeleteGig] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<Omit<CreatePaymentRequest, "gigId">>({ amount: 0 });
  const [showAddRole, setShowAddRole] = useState(false);
  const [roleForm, setRoleForm] = useState({ roleName: "" });
  const [showAddLineItem, setShowAddLineItem] = useState(false);
  const [lineItemForm, setLineItemForm] = useState<CreateGigLineItemRequest>({ description: "", amount: 0 });

  // Invoice preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const prevUrlRef = useRef<string | null>(null);
  const [showInvoicePdf, setShowInvoicePdf] = useState(false);
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null);
  const invoicePdfUrlRef = useRef<string | null>(null);
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState<{ id: number } | null>(null);

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error || !gig) return <main className="container"><ErrorBanner error={error ?? "Gig not found"} /></main>;

  function startEdit() {
    setEditForm({
      firstName: gig!.firstName,
      lastName: gig!.lastName,
      partnerName: gig!.partnerName,
      email: gig!.email,
      phone: gig!.phone,
      date: gig!.date,
      venueName: gig!.venueName,
      location: gig!.location,
      description: gig!.description,
      status: gig!.status,
      totalPrice: gig!.totalPrice,
      travelCost: gig!.travelCost,
      discountPercent: gig!.discountPercent,
    });
    setEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    await updateGig.mutateAsync({ id: gigId, input: editForm });
    setEditing(false);
  }

  async function handleDeleteGig() {
    await deleteGig.mutateAsync(gigId);
    navigate("/gigs");
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    await createPayment.mutateAsync({ gigId, ...paymentForm });
    setShowAddPayment(false);
    setPaymentForm({ amount: 0 });
  }

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    await createRole.mutateAsync({ gigId, roleName: roleForm.roleName });
    setShowAddRole(false);
    setRoleForm({ roleName: "" });
  }

  async function handleAddLineItem(e: React.FormEvent) {
    e.preventDefault();
    await addGigLineItem.mutateAsync({ gigId, input: lineItemForm });
    setShowAddLineItem(false);
    setLineItemForm({ description: "", amount: 0 });
  }

  async function openPreview() {
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    setPreviewUrl(null);
    setPreviewLoaded(false);
    setShowPreview(true);
    
    const url = await previewMutation.mutateAsync(gigId);
    prevUrlRef.current = url;
    setPreviewUrl(url);
  }

  async function handleSaveInvoice() {
    setSavingInvoice(true);
    try {
      await createInvoice.mutateAsync({ gigId });
      setShowPreview(false);
    } finally {
      setSavingInvoice(false);
    }
  }

  async function openInvoicePdf(invoiceId: number) {
    if (invoicePdfUrlRef.current) URL.revokeObjectURL(invoicePdfUrlRef.current);
    setInvoicePdfUrl(null);
    setShowInvoicePdf(true);
    const url = await savedPdfMutation.mutateAsync(invoiceId);
    invoicePdfUrlRef.current = url;
    setInvoicePdfUrl(url);
  }

  async function handleDeleteInvoice() {
    if (!deleteInvoiceTarget) return;
    await deleteInvoice.mutateAsync({ id: deleteInvoiceTarget.id, gigId });
    setDeleteInvoiceTarget(null);
  }

  return (
    <main className="container">
      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to="/gigs">Gigs</Link></li>
          <li>{gig.firstName} {gig.lastName}</li>
        </ul>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        <hgroup>
          <h1>{gig.firstName} {gig.lastName}</h1>
          <p><StatusBadge status={gig.status} /> {gig.venueName && `· ${gig.venueName}`} {gig.location && `· ${gig.location}`}</p>
        </hgroup>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="secondary" onClick={startEdit}>Edit</button>
          <button className="contrast outline" onClick={() => setShowDeleteGig(true)}>Delete</button>
        </div>
      </div>

      {!editing ? (
        <article>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
            <dt>Date</dt><dd>{formatDate(gig.date)}</dd>
            <dt>Partner</dt><dd>{gig.partnerName ?? "—"}</dd>
            <dt>Email</dt><dd>{gig.email ?? "—"}</dd>
            <dt>Phone</dt><dd>{gig.phone ?? "—"}</dd>
            <dt>Total Price</dt><dd><MoneyDisplay pennies={gig.totalPrice} /></dd>
            <dt>Deposit Paid</dt><dd><MoneyDisplay pennies={gig.depositPaid} /></dd>
            <dt>Balance</dt><dd><MoneyDisplay pennies={gig.balanceAmount} /></dd>
            <dt>Travel Cost</dt><dd><MoneyDisplay pennies={gig.travelCost} /></dd>
            <dt>Discount</dt><dd>{gig.discountPercent}%</dd>
            {gig.description && <><dt>Notes</dt><dd>{gig.description}</dd></>}
          </dl>
        </article>
      ) : (
        <article>
          <form onSubmit={saveEdit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              <FormField label="First Name" value={editForm.firstName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} required />
              <FormField label="Last Name" value={editForm.lastName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} />
              <FormField label="Partner" value={editForm.partnerName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, partnerName: e.target.value }))} />
              <FormField label="Email" type="email" value={editForm.email ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
              <FormField label="Phone" type="tel" value={editForm.phone ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              <FormField label="Date" type="date" value={toInputDate(editForm.date)} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} required />
              <FormField label="Venue" value={editForm.venueName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, venueName: e.target.value }))} />
              <FormField label="Location" value={editForm.location ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
              <FormField as="select" label="Status" value={editForm.status ?? "enquiry"} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </FormField>
              <FormField label="Total Price (p)" type="number" value={editForm.totalPrice ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, totalPrice: Number(e.target.value) }))} />
              <FormField label="Travel Cost (p)" type="number" value={editForm.travelCost ?? 0} onChange={(e) => setEditForm((f) => ({ ...f, travelCost: Number(e.target.value) }))} min={0} />
              <FormField label="Discount (%)" type="number" value={editForm.discountPercent ?? 0} onChange={(e) => setEditForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))} min={0} max={100} />
            </div>
            <FormField as="textarea" label="Description" value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" aria-busy={updateGig.isPending} disabled={updateGig.isPending}>Save</button>
              <button type="button" className="secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        </article>
      )}

      {/* Services */}
      <section>
        <h2>Services</h2>
        {gig.services && gig.services.length > 0 ? (
          <table>
            <thead><tr><th>Service</th><th>Price to Client</th></tr></thead>
            <tbody>
              {gig.services.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td><MoneyDisplay pennies={s.priceToClient} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No services attached to this gig.</p>}
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
            <thead><tr><th>Description</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {gig.lineItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.description ?? "—"}</td>
                  <td><MoneyDisplay pennies={item.amount} /></td>
                  <td><button className="contrast outline" style={{ padding: "0.2em 0.5em" }} onClick={() => removeGigLineItem.mutate({ gigId, itemId: item.id })}>✕</button></td>
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
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Description</th><th></th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.date)}</td>
                  <td><MoneyDisplay pennies={p.amount} /></td>
                  <td>{p.method ?? "—"}</td>
                  <td>{p.description ?? "—"}</td>
                  <td><button className="contrast outline" style={{ padding: "0.2em 0.5em" }} onClick={() => deletePayment.mutate({ id: p.id, gigId })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No payments recorded.</p>}
      </section>

      {/* Roles */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Assigned Roles</h2>
          <button className="secondary" onClick={() => setShowAddRole(true)}>+ Add</button>
        </div>
        {roles && roles.length > 0 ? (
          <table>
            <thead><tr><th>Role</th><th>Person</th><th></th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.roleName}</td>
                  <td>{r.personId ?? "—"}</td>
                  <td><button className="contrast outline" style={{ padding: "0.2em 0.5em" }} onClick={() => deleteRole.mutate({ id: r.id, gigId })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No roles assigned.</p>}
      </section>

      {/* Invoices link */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Invoices</h2>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
            <button
              onClick={openPreview}
              disabled={!gig.lineItems?.length}
              title={!gig.lineItems?.length ? "Add line items before generating an invoice" : undefined}
            >
              Preview &amp; Generate Invoice
            </button>
            {!gig.lineItems?.length && (
              <small style={{ color: "var(--pico-muted-color)" }}>Add line items first</small>
            )}
          </div>
        </div>
        {invoices && invoices.length > 0 ? (
          <table>
            <thead><tr><th>Invoice #</th><th>Date</th><th>Total</th><th>Amount Due</th><th></th></tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoiceNumber}</td>
                  <td>{formatDate(inv.date)}</td>
                  <td><MoneyDisplay pennies={inv.totalAmount} /></td>
                  <td><MoneyDisplay pennies={inv.amountDue} /></td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={() => openInvoicePdf(inv.id)} aria-busy={savedPdfMutation.isPending}>PDF</button>
                      <button className="contrast outline" style={{ padding: "0.2em 0.5em" }} onClick={() => setDeleteInvoiceTarget({ id: inv.id })}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: "var(--pico-muted-color)" }}>No invoices yet. Use "Preview &amp; Generate Invoice" to create one.</p>}
      </section>

      {/* Modals */}
      <Modal open={showAddPayment} onClose={() => setShowAddPayment(false)} title="Add Payment">
        <form onSubmit={handleAddPayment}>
          <FormField label="Amount (pennies)" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: Number(e.target.value) }))} required min={0} />
          <FormField label="Date" type="date" value={toInputDate(paymentForm.date)} onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))} />
          <FormField label="Method" value={paymentForm.method ?? ""} onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))} placeholder="e.g. Bank transfer" />
          <FormField label="Description" value={paymentForm.description ?? ""} onChange={(e) => setPaymentForm((f) => ({ ...f, description: e.target.value }))} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowAddPayment(false)}>Cancel</button>
            <button type="submit" aria-busy={createPayment.isPending} disabled={createPayment.isPending}>Add</button>
          </footer>
        </form>
      </Modal>

      <Modal open={showAddRole} onClose={() => setShowAddRole(false)} title="Add Role">
        <form onSubmit={handleAddRole}>
          <FormField label="Role Name" value={roleForm.roleName} onChange={(e) => setRoleForm({ roleName: e.target.value })} required placeholder="e.g. Lead Vocalist" />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowAddRole(false)}>Cancel</button>
            <button type="submit" aria-busy={createRole.isPending} disabled={createRole.isPending}>Add</button>
          </footer>
        </form>
      </Modal>

      <ConfirmDelete
        open={showDeleteGig}
        itemName={`${gig.firstName} ${gig.lastName ?? ""}`.trim()}
        onConfirm={handleDeleteGig}
        onCancel={() => setShowDeleteGig(false)}
        loading={deleteGig.isPending}
      />

      {/* Add Line Item Modal */}
      <Modal open={showAddLineItem} onClose={() => setShowAddLineItem(false)} title="Add Line Item">
        <form onSubmit={handleAddLineItem}>
          <FormField label="Description" value={lineItemForm.description ?? ""} onChange={(e) => setLineItemForm((f) => ({ ...f, description: e.target.value }))} required placeholder="e.g. 3-piece band" />
          <FormField label="Amount (pennies)" type="number" value={lineItemForm.amount ?? 0} onChange={(e) => setLineItemForm((f) => ({ ...f, amount: Number(e.target.value) }))} required min={0} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowAddLineItem(false)}>Cancel</button>
            <button type="submit" aria-busy={addGigLineItem.isPending} disabled={addGigLineItem.isPending}>Add</button>
          </footer>
        </form>
      </Modal>

      {/* Invoice Preview Modal */}
      <dialog open={showPreview} style={{ maxWidth: "90vw", width: "900px", padding: "1.5rem" }}>
        <article style={{ margin: 0 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Invoice Preview</strong>
            <button className="secondary outline" style={{ padding: "0.3em 0.7em" }} onClick={() => setShowPreview(false)}>✕</button>
          </header>
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
        </article>
      </dialog>

      {/* Saved Invoice PDF viewer */}
      <dialog open={showInvoicePdf} style={{ maxWidth: "90vw", width: "900px", padding: "1.5rem" }}>
        <article style={{ margin: 0 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Invoice PDF</strong>
            <button className="secondary outline" style={{ padding: "0.3em 0.7em" }} onClick={() => setShowInvoicePdf(false)}>✕</button>
          </header>
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
              <a href={invoicePdfUrl} download="invoice.pdf" role="button">Download PDF</a>
            )}
          </footer>
        </article>
      </dialog>

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
