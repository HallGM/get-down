import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useInvoice,
  useUpdateInvoice,
  useAddLineItem,
  useRemoveLineItem,
  useUpdateLineItem,
  useAddAdditionalCharge,
  useRemoveAdditionalCharge,
  useUpdateAdditionalCharge,
  useAddPaymentMade,
  useRemovePaymentMade,
  useUpdatePaymentMade,
} from "../../api/hooks/useInvoices.js";
import { useGig } from "../../api/hooks/useGigs.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import FormField from "../../components/FormField.js";
import MoneyField from "../../components/MoneyField.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import type {
  InvoiceLineItem,
  InvoiceAdditionalCharge,
  InvoicePaymentMade,
} from "@get-down/shared";

// ── helpers ───────────────────────────────────────────────────────────────

function calcTotals(
  lineItems: InvoiceLineItem[],
  additionalCharges: InvoiceAdditionalCharge[],
  paymentsMade: InvoicePaymentMade[],
  discountPercent: number,
  travelCost: number
) {
  const subtotal = lineItems.reduce((s, li) => s + (li.amount ?? 0), 0);
  const discountAmount = Math.round(subtotal * discountPercent / 100);
  const total = subtotal - discountAmount + travelCost + additionalCharges.reduce((s, c) => s + (c.amount ?? 0), 0);
  const totalPaid = paymentsMade.reduce((s, p) => s + (p.amount ?? 0), 0);
  const amountDue = Math.max(0, total - totalPaid);
  return { subtotal, discountAmount, total, amountDue };
}

// ── inline-edit row for line items / charges ────────────────────────────

interface LineRowProps {
  id: number;
  description?: string;
  amount?: number;
  onSave: (id: number, description: string, amount: number) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  saving: boolean;
}

function LineRow({ id, description, amount, onSave, onRemove, saving }: LineRowProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ description: description ?? "", amount: amount ?? 0 });
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleSave() {
    setRowError(null);
    try {
      await onSave(id, form.description, form.amount);
      setEditing(false);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (editing) {
    return (
      <>
        <tr>
          <td>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ margin: 0 }}
              aria-label="Description"
            />
          </td>
          <td>
            <MoneyField
              label=""
              value={form.amount}
              onChange={pennies => setForm(f => ({ ...f, amount: pennies ?? 0 }))}
              style={{ margin: 0 }}
            />
          </td>
          <td>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button
                style={{ padding: "0.4em 0.75em" }}
                onClick={handleSave}
                disabled={saving}
                aria-busy={saving}
              >Save</button>
              <button
                className="secondary outline"
                style={{ padding: "0.4em 0.75em" }}
                onClick={() => { setForm({ description: description ?? "", amount: amount ?? 0 }); setEditing(false); setRowError(null); }}
              >Cancel</button>
            </div>
          </td>
        </tr>
        {rowError && (
          <tr><td colSpan={3}><small style={{ color: "var(--pico-del-color)" }}>{rowError}</small></td></tr>
        )}
      </>
    );
  }

  return (
    <tr>
      <td>{description ?? "—"}</td>
      <td><MoneyDisplay pennies={amount} /></td>
      <td>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            className="secondary outline"
            style={{ padding: "0.4em 0.75em" }}
            onClick={() => { setForm({ description: description ?? "", amount: amount ?? 0 }); setEditing(true); }}
            aria-label="Edit line"
          >✏️</button>
          <button
            className="contrast outline"
            style={{ padding: "0.4em 0.75em" }}
            onClick={() => onRemove(id)}
            disabled={saving}
            aria-label="Remove line"
          >✕</button>
        </div>
      </td>
    </tr>
  );
}

// ── inline-edit row for payments made ────────────────────────────────────

interface PaymentRowProps {
  id: number;
  description?: string;
  date?: string;
  amount?: number;
  onSave: (id: number, description: string, date: string, amount: number) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  saving: boolean;
}

function PaymentRow({ id, description, date, amount, onSave, onRemove, saving }: PaymentRowProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ description: description ?? "", date: date ?? "", amount: amount ?? 0 });
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleSave() {
    setRowError(null);
    try {
      await onSave(id, form.description, form.date, form.amount);
      setEditing(false);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (editing) {
    return (
      <>
        <tr>
          <td>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ margin: 0 }}
              aria-label="Date"
            />
          </td>
          <td>
            <MoneyField
              label=""
              value={form.amount}
              onChange={pennies => setForm(f => ({ ...f, amount: pennies ?? 0 }))}
              style={{ margin: 0 }}
            />
          </td>
          <td>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ margin: 0 }}
              aria-label="Description"
            />
          </td>
          <td>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button
                style={{ padding: "0.4em 0.75em" }}
                onClick={handleSave}
                disabled={saving}
                aria-busy={saving}
              >Save</button>
              <button
                className="secondary outline"
                style={{ padding: "0.4em 0.75em" }}
                onClick={() => { setForm({ description: description ?? "", date: date ?? "", amount: amount ?? 0 }); setEditing(false); setRowError(null); }}
              >Cancel</button>
            </div>
          </td>
        </tr>
        {rowError && (
          <tr><td colSpan={4}><small style={{ color: "var(--pico-del-color)" }}>{rowError}</small></td></tr>
        )}
      </>
    );
  }

  return (
    <tr>
      <td>{formatDate(date)}</td>
      <td><MoneyDisplay pennies={amount} /></td>
      <td>{description ?? "—"}</td>
      <td>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            className="secondary outline"
            style={{ padding: "0.4em 0.75em" }}
            onClick={() => { setForm({ description: description ?? "", date: date ?? "", amount: amount ?? 0 }); setEditing(true); }}
            aria-label="Edit payment"
          >✏️</button>
          <button
            className="contrast outline"
            style={{ padding: "0.4em 0.75em" }}
            onClick={() => onRemove(id)}
            disabled={saving}
            aria-label="Remove payment"
          >✕</button>
        </div>
      </td>
    </tr>
  );
}

// ── add-row for line items / charges ─────────────────────────────────────

interface AddLineRowProps {
  onAdd: (description: string, amount: number) => Promise<void>;
  saving: boolean;
}

function AddLineRow({ onAdd, saving }: AddLineRowProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: 0 });

  async function handleAdd() {
    await onAdd(form.description, form.amount);
    setForm({ description: "", amount: 0 });
    setOpen(false);
  }

  if (!open) {
    return (
      <tr>
        <td colSpan={3}>
          <button className="secondary outline" style={{ padding: "0.4em 0.75em" }} onClick={() => setOpen(true)}>+ Add</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>
        <input
          type="text"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Description"
          style={{ margin: 0 }}
        />
      </td>
      <td>
        <MoneyField label="" value={form.amount} onChange={pennies => setForm(f => ({ ...f, amount: pennies ?? 0 }))} style={{ margin: 0 }} />
      </td>
      <td>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button style={{ padding: "0.4em 0.75em" }} onClick={handleAdd} disabled={saving} aria-busy={saving}>Add</button>
          <button className="secondary outline" style={{ padding: "0.4em 0.75em" }} onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}

// ── add-row for payments made ─────────────────────────────────────────────

interface AddPaymentRowProps {
  onAdd: (description: string, date: string, amount: number) => Promise<void>;
  saving: boolean;
}

function AddPaymentRow({ onAdd, saving }: AddPaymentRowProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", date: "", amount: 0 });

  async function handleAdd() {
    await onAdd(form.description, form.date, form.amount);
    setForm({ description: "", date: "", amount: 0 });
    setOpen(false);
  }

  if (!open) {
    return (
      <tr>
        <td colSpan={4}>
          <button className="secondary outline" style={{ padding: "0.4em 0.75em" }} onClick={() => setOpen(true)}>+ Add</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ margin: 0 }} />
      </td>
      <td>
        <MoneyField label="" value={form.amount} onChange={pennies => setForm(f => ({ ...f, amount: pennies ?? 0 }))} style={{ margin: 0 }} />
      </td>
      <td>
        <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" style={{ margin: 0 }} />
      </td>
      <td>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button style={{ padding: "0.4em 0.75em" }} onClick={handleAdd} disabled={saving} aria-busy={saving}>Add</button>
          <button className="secondary outline" style={{ padding: "0.4em 0.75em" }} onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}

// ── main page ─────────────────────────────────────────────────────────────

export default function InvoiceEdit() {
  const { id, invoiceId } = useParams<{ id: string; invoiceId: string }>();
  const gigId = Number(id);
  const invId = Number(invoiceId);
  const navigate = useNavigate();

  const { data: gig } = useGig(gigId);
  const { data: invoice, isLoading, error } = useInvoice(invId);

  // Header form state — initialised via useEffect once invoice loads
  const [header, setHeader] = useState<{
    customerName: string;
    date: string;
    eventDate: string;
    venue: string;
    discountPercent: number;
    travelCost: number;
  } | null>(null);

  useEffect(() => {
    if (!invoice) return;
    setHeader({
      customerName: invoice.customerName,
      date: invoice.date,
      eventDate: invoice.eventDate ?? "",
      venue: invoice.venue ?? "",
      discountPercent: invoice.discountPercent,
      travelCost: invoice.travelCost,
    });
  }, [invoice?.id]);

  const updateInvoice = useUpdateInvoice();
  const addLineItem = useAddLineItem();
  const removeLineItem = useRemoveLineItem();
  const updateLineItem = useUpdateLineItem();
  const addAdditionalCharge = useAddAdditionalCharge();
  const removeAdditionalCharge = useRemoveAdditionalCharge();
  const updateAdditionalCharge = useUpdateAdditionalCharge();
  const addPaymentMade = useAddPaymentMade();
  const removePaymentMade = useRemovePaymentMade();
  const updatePaymentMade = useUpdatePaymentMade();

  const [headerError, setHeaderError] = useState<string | null>(null);

  if (isLoading || !header) return <main className="container"><LoadingState /></main>;
  if (error || !invoice) return <main className="container"><ErrorBanner error={error ?? "Invoice not found"} /></main>;

  const lineItems = invoice.lineItems ?? [];
  const additionalCharges = invoice.additionalCharges ?? [];
  const paymentsMade = invoice.paymentsMade ?? [];

  const { subtotal, discountAmount, total, amountDue } = calcTotals(
    lineItems, additionalCharges, paymentsMade, header.discountPercent, header.travelCost
  );

  // ── helper: persist updated totals to the invoice header ──────────────

  async function saveTotals(
    items: InvoiceLineItem[],
    charges: InvoiceAdditionalCharge[],
    payments: InvoicePaymentMade[],
    discountPct: number,
    travelCostPennies: number,
    extraHeaderFields?: Partial<typeof header>
  ) {
    const t = calcTotals(items, charges, payments, discountPct, travelCostPennies);
    const h = { ...header!, ...extraHeaderFields };
    await updateInvoice.mutateAsync({
      id: invId,
      gigId,
      input: {
        customerName: h.customerName,
        date: h.date || undefined,
        eventDate: h.eventDate || undefined,
        venue: h.venue || undefined,
        discountPercent: discountPct,
        travelCost: travelCostPennies,
        subtotalAmount: t.subtotal,
        totalAmount: t.total,
        amountDue: t.amountDue,
      },
    });
  }

  // ── header save ────────────────────────────────────────────────────────

  async function handleSaveHeader(e: React.FormEvent) {
    e.preventDefault();
    setHeaderError(null);
    if (!header!.customerName.trim()) {
      setHeaderError("Customer name is required");
      return;
    }
    await saveTotals(lineItems, additionalCharges, paymentsMade, header!.discountPercent, header!.travelCost, header!);
  }

  // ── handler factory ────────────────────────────────────────────────────
  // Returns [handleAdd, handleUpdate, handleRemove] for a given sub-resource
  // so the three sections (line items, charges, payments made) stay DRY.

  function makeLineHandlers(
    current: InvoiceLineItem[],
    mutators: {
      add: typeof addLineItem;
      update: typeof updateLineItem;
      remove: typeof removeLineItem;
    }
  ) {
    async function handleAdd(description: string, amount: number) {
      const newItem = await mutators.add.mutateAsync({ invoiceId: invId, input: { description, amount } });
      await saveTotals([...current, newItem], additionalCharges, paymentsMade, header!.discountPercent, header!.travelCost);
    }
    async function handleUpdate(itemId: number, description: string, amount: number) {
      await mutators.update.mutateAsync({ invoiceId: invId, itemId, input: { description, amount } });
      const updated = current.map(li => li.id === itemId ? { ...li, description, amount } : li);
      await saveTotals(updated, additionalCharges, paymentsMade, header!.discountPercent, header!.travelCost);
    }
    async function handleRemove(itemId: number) {
      await mutators.remove.mutateAsync({ invoiceId: invId, itemId });
      await saveTotals(current.filter(li => li.id !== itemId), additionalCharges, paymentsMade, header!.discountPercent, header!.travelCost);
    }
    return { handleAdd, handleUpdate, handleRemove };
  }

  function makeChargeHandlers(current: InvoiceAdditionalCharge[]) {
    async function handleAdd(description: string, amount: number) {
      const newItem = await addAdditionalCharge.mutateAsync({ invoiceId: invId, input: { description, amount } });
      await saveTotals(lineItems, [...current, newItem], paymentsMade, header!.discountPercent, header!.travelCost);
    }
    async function handleUpdate(chargeId: number, description: string, amount: number) {
      await updateAdditionalCharge.mutateAsync({ invoiceId: invId, chargeId, input: { description, amount } });
      const updated = current.map(c => c.id === chargeId ? { ...c, description, amount } : c);
      await saveTotals(lineItems, updated, paymentsMade, header!.discountPercent, header!.travelCost);
    }
    async function handleRemove(chargeId: number) {
      await removeAdditionalCharge.mutateAsync({ invoiceId: invId, chargeId });
      await saveTotals(lineItems, current.filter(c => c.id !== chargeId), paymentsMade, header!.discountPercent, header!.travelCost);
    }
    return { handleAdd, handleUpdate, handleRemove };
  }

  function makePaymentHandlers(current: InvoicePaymentMade[]) {
    async function handleAdd(description: string, date: string, amount: number) {
      const newItem = await addPaymentMade.mutateAsync({ invoiceId: invId, input: { description, date: date || undefined, amount } });
      await saveTotals(lineItems, additionalCharges, [...current, newItem], header!.discountPercent, header!.travelCost);
    }
    async function handleUpdate(pmId: number, description: string, date: string, amount: number) {
      await updatePaymentMade.mutateAsync({ invoiceId: invId, paymentMadeId: pmId, input: { description, date: date || undefined, amount } });
      const updated = current.map(p => p.id === pmId ? { ...p, description, date, amount } : p);
      await saveTotals(lineItems, additionalCharges, updated, header!.discountPercent, header!.travelCost);
    }
    async function handleRemove(pmId: number) {
      await removePaymentMade.mutateAsync({ invoiceId: invId, paymentMadeId: pmId });
      await saveTotals(lineItems, additionalCharges, current.filter(p => p.id !== pmId), header!.discountPercent, header!.travelCost);
    }
    return { handleAdd, handleUpdate, handleRemove };
  }

  const lineHandlers = makeLineHandlers(lineItems, {
    add: addLineItem,
    update: updateLineItem,
    remove: removeLineItem,
  });
  const chargeHandlers = makeChargeHandlers(additionalCharges);
  const paymentHandlers = makePaymentHandlers(paymentsMade);

  const mutating =
    updateInvoice.isPending ||
    addLineItem.isPending || removeLineItem.isPending || updateLineItem.isPending ||
    addAdditionalCharge.isPending || removeAdditionalCharge.isPending || updateAdditionalCharge.isPending ||
    addPaymentMade.isPending || removePaymentMade.isPending || updatePaymentMade.isPending;

  const anyError =
    updateInvoice.error || addLineItem.error || removeLineItem.error || updateLineItem.error ||
    addAdditionalCharge.error || removeAdditionalCharge.error || updateAdditionalCharge.error ||
    addPaymentMade.error || removePaymentMade.error || updatePaymentMade.error;

  return (
    <main className="container">
      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to="/gigs">Gigs</Link></li>
          <li><Link to={`/gigs/${gigId}`}>{gig ? `${gig.firstName} ${gig.lastName}` : gigId}</Link></li>
          <li><Link to={`/gigs/${gigId}`}>Invoice &amp; Billing</Link></li>
          <li aria-current="page">Edit Invoice {invoice.invoiceNumber}</li>
        </ul>
      </nav>

      <div style={{ marginBottom: "1rem" }}>
        <button className="secondary outline" style={{ padding: "0.35em 0.85em", marginBottom: "0.75rem" }} onClick={() => navigate(`/gigs/${gigId}`)}>
          ← Back to Billing
        </button>
        <h1 style={{ margin: 0 }}>Edit Invoice {invoice.invoiceNumber}</h1>
      </div>

      {anyError && (
        <ErrorBanner error={anyError instanceof Error ? anyError.message : "An error occurred"} />
      )}

      {/* Invoice Summary */}
      <article>
        <header><strong>Totals</strong></header>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
          <dt>Subtotal</dt><dd><MoneyDisplay pennies={subtotal} /></dd>
          {header.discountPercent > 0 && (
            <><dt>Discount ({header.discountPercent}%)</dt><dd>−<MoneyDisplay pennies={discountAmount} /></dd></>
          )}
          {header.travelCost > 0 && (
            <><dt>Travel Cost</dt><dd><MoneyDisplay pennies={header.travelCost} /></dd></>
          )}
          {additionalCharges.length > 0 && (
            <><dt>Additional Charges</dt><dd><MoneyDisplay pennies={additionalCharges.reduce((s, c) => s + (c.amount ?? 0), 0)} /></dd></>
          )}
          <dt>Total</dt><dd><strong><MoneyDisplay pennies={total} /></strong></dd>
          <dt>Amount Due</dt><dd><strong><MoneyDisplay pennies={amountDue} /></strong></dd>
        </dl>
      </article>

      {/* Header fields */}
      <section>
        <h2>Invoice Details</h2>
        <form onSubmit={handleSaveHeader}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            <FormField
              label="Customer Name"
              value={header.customerName}
              onChange={e => setHeader(h => ({ ...h!, customerName: e.target.value }))}
              required
            />
            <FormField
              label="Invoice Date"
              type="date"
              value={toInputDate(header.date)}
              onChange={e => setHeader(h => ({ ...h!, date: e.target.value }))}
            />
            <FormField
              label="Event Date"
              type="date"
              value={toInputDate(header.eventDate)}
              onChange={e => setHeader(h => ({ ...h!, eventDate: e.target.value }))}
            />
            <FormField
              label="Venue"
              value={header.venue}
              onChange={e => setHeader(h => ({ ...h!, venue: e.target.value }))}
            />
            <FormField
              label="Discount (%)"
              type="number"
              value={header.discountPercent}
              min={0}
              max={100}
              onChange={e => setHeader(h => ({ ...h!, discountPercent: Number(e.target.value) }))}
            />
            <MoneyField
              label="Travel Cost"
              value={header.travelCost}
              onChange={pennies => setHeader(h => ({ ...h!, travelCost: pennies ?? 0 }))}
              min={0}
            />
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <small style={{ color: "var(--pico-muted-color)" }}>
              Invoice number: {invoice.invoiceNumber} &nbsp;·&nbsp; Type: {invoice.invoiceType}
            </small>
          </div>
          {headerError && <ErrorBanner error={headerError} />}
          <div style={{ marginTop: "0.75rem" }}>
            <button type="submit" aria-busy={updateInvoice.isPending} disabled={mutating}>Save Details</button>
          </div>
        </form>
      </section>

      {/* Line items */}
      <section>
        <h2>Line Items</h2>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map(li => (
              <LineRow
                key={li.id}
                id={li.id}
                description={li.description}
                amount={li.amount}
                onSave={lineHandlers.handleUpdate}
                onRemove={lineHandlers.handleRemove}
                saving={mutating}
              />
            ))}
            <AddLineRow onAdd={lineHandlers.handleAdd} saving={mutating} />
          </tbody>
        </table>
      </section>

      {/* Additional charges */}
      <section>
        <h2>Additional Charges</h2>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {additionalCharges.map(c => (
              <LineRow
                key={c.id}
                id={c.id}
                description={c.description}
                amount={c.amount}
                onSave={chargeHandlers.handleUpdate}
                onRemove={chargeHandlers.handleRemove}
                saving={mutating}
              />
            ))}
            <AddLineRow onAdd={chargeHandlers.handleAdd} saving={mutating} />
          </tbody>
        </table>
      </section>

      {/* Payments made */}
      <section>
        <h2>Payments Made</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Description</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {paymentsMade.map(p => (
              <PaymentRow
                key={p.id}
                id={p.id}
                description={p.description}
                date={p.date}
                amount={p.amount}
                onSave={paymentHandlers.handleUpdate}
                onRemove={paymentHandlers.handleRemove}
                saving={mutating}
              />
            ))}
            <AddPaymentRow onAdd={paymentHandlers.handleAdd} saving={mutating} />
          </tbody>
        </table>
      </section>
    </main>
  );
}
