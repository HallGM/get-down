import { useState } from "react";
import type { ExpensePayment, CreateExpensePaymentRequest, UpdateExpensePaymentRequest } from "@get-down/shared";
import { useAccounts } from "../api/hooks/useAccounts.js";
import {
  useExpensePayments,
  useCreateExpensePayment,
  useUpdateExpensePayment,
  useDeleteExpensePayment,
} from "../api/hooks/useExpensePayments.js";
import MoneyField from "./MoneyField.js";
import FormField from "./FormField.js";
import ConfirmDelete from "./ConfirmDelete.js";
import MoneyDisplay from "./MoneyDisplay.js";
import PaymentStatusBadge from "./PaymentStatusBadge.js";
import { formatDate, toInputDate } from "../utils/date.js";

interface PaymentFormState {
  accountId: number | "";
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
}

const EMPTY_FORM: PaymentFormState = {
  accountId: "",
  amount: 0,
  date: "",
  paymentMethod: "",
  description: "",
};


interface Props {
  expenseId: number;
  amount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
}

export default function ExpensePaymentsSection({ expenseId, amount, paymentStatus }: Props) {
  const { data: payments = [], isLoading } = useExpensePayments(expenseId);
  const { data: accounts = [] } = useAccounts();
  const createPayment = useCreateExpensePayment(expenseId);
  const updatePayment = useUpdateExpensePayment(expenseId);
  const deletePayment = useDeleteExpensePayment(expenseId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PaymentFormState>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<ExpensePayment | null>(null);
  const [editForm, setEditForm] = useState<PaymentFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ExpensePayment | null>(null);

  const accountMap = new Map(accounts.map((a) => [a.id, a.personName]));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accountId) return;
    const input: CreateExpensePaymentRequest = {
      accountId: Number(form.accountId),
      amount: form.amount,
      date: form.date || undefined,
      paymentMethod: form.paymentMethod || undefined,
      description: form.description || undefined,
    };
    await createPayment.mutateAsync(input);
    setShowForm(false);
    setForm(EMPTY_FORM);
  }

  function openEdit(payment: ExpensePayment) {
    setEditTarget(payment);
    setEditForm({
      accountId: payment.accountId,
      amount: payment.amount,
      date: toInputDate(payment.date),
      paymentMethod: payment.paymentMethod ?? "",
      description: payment.description ?? "",
    });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm.accountId) return;
    const input: UpdateExpensePaymentRequest = {
      accountId: Number(editForm.accountId),
      amount: editForm.amount,
      date: editForm.date || undefined,
      paymentMethod: editForm.paymentMethod || undefined,
      description: editForm.description || undefined,
    };
    await updatePayment.mutateAsync({ paymentId: editTarget.id, input });
    setEditTarget(null);
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <strong>Payments</strong>
          <PaymentStatusBadge status={paymentStatus} />
        </div>
        {!showForm && !editTarget && (
          <button
            type="button"
            className="secondary outline"
            style={{ padding: "0.2em 0.6em", fontSize: "0.875rem" }}
            onClick={() => setShowForm(true)}
          >
            + Add Payment
          </button>
        )}
      </div>

      {/* Payments list */}
      {isLoading ? (
        <p style={{ color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>Loading payments…</p>
      ) : payments.length === 0 && !showForm ? (
        <p style={{ color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>No payments recorded yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {payments.map((p) => (
            editTarget?.id === p.id ? (
              <form key={p.id} onSubmit={handleUpdate} style={{ border: "1px solid var(--pico-muted-border-color)", borderRadius: "var(--pico-border-radius)", padding: "0.75rem" }}>
                <PaymentFormFields form={editForm} setForm={setEditForm} accounts={accounts} />
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                  <button type="button" className="secondary outline" style={{ padding: "0.2em 0.6em" }} onClick={() => setEditTarget(null)}>Cancel</button>
                  <button type="submit" style={{ padding: "0.2em 0.6em" }} aria-busy={updatePayment.isPending} disabled={updatePayment.isPending}>Save</button>
                </div>
              </form>
            ) : (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0.6rem", background: "var(--pico-card-background-color)", borderRadius: "var(--pico-border-radius)", border: "1px solid var(--pico-muted-border-color)" }}>
                <span style={{ flex: "0 0 90px", fontWeight: 600, color: p.amount < 0 ? "var(--pico-del-color, #dc3545)" : "inherit" }}>
                  {p.amount < 0 ? "-" : ""}<MoneyDisplay pennies={Math.abs(p.amount)} />
                </span>
                <span style={{ flex: "0 0 90px", color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>{p.date ? formatDate(p.date) : "—"}</span>
                <span style={{ flex: 1 }}>{accountMap.get(p.accountId) ?? "Unknown"}</span>
                {p.paymentMethod && <span style={{ color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>{p.paymentMethod}</span>}
                {p.description && <span style={{ color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>{p.description}</span>}
                <div style={{ display: "flex", gap: "0.25rem", marginLeft: "auto" }}>
                  <button type="button" className="secondary outline" style={{ padding: "0.15em 0.5em", fontSize: "0.8rem" }} onClick={() => openEdit(p)}>Edit</button>
                  <button type="button" className="contrast outline" style={{ padding: "0.15em 0.5em", fontSize: "0.8rem" }} onClick={() => setDeleteTarget(p)}>Delete</button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Add payment form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ border: "1px solid var(--pico-muted-border-color)", borderRadius: "var(--pico-border-radius)", padding: "0.75rem", marginBottom: "0.5rem" }}>
          <PaymentFormFields form={form} setForm={setForm} accounts={accounts} />
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button type="button" className="secondary outline" style={{ padding: "0.2em 0.6em" }} onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancel</button>
            <button type="submit" style={{ padding: "0.2em 0.6em" }} aria-busy={createPayment.isPending} disabled={createPayment.isPending || !form.accountId}>Record Payment</button>
          </div>
        </form>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={`payment of ${deleteTarget.amount < 0 ? "-" : ""}${(Math.abs(deleteTarget.amount) / 100).toFixed(2)}`}
          onConfirm={async () => {
            await deletePayment.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
          loading={deletePayment.isPending}
        />
      )}
    </div>
  );
}

// ─── Shared form fields ───────────────────────────────────────────────────────

function PaymentFormFields({
  form,
  setForm,
  accounts,
}: {
  form: PaymentFormState;
  setForm: (fn: (f: PaymentFormState) => PaymentFormState) => void;
  accounts: { id: number; personName: string }[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
      <div>
        <label>
          <small><strong>Paid by</strong></small>
          <select
            value={form.accountId}
            onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value ? Number(e.target.value) : "" }))}
            required
            style={{ marginTop: "0.25rem" }}
          >
            <option value="">— select payer —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.personName}</option>
            ))}
          </select>
        </label>
      </div>
      <MoneyField
        label="Amount"
        hint="negative = refund"
        value={form.amount}
        onChange={(pennies) => setForm((f) => ({ ...f, amount: pennies ?? 0 }))}
        required
      />
      <FormField
        label="Date"
        type="date"
        value={form.date}
        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
      />
      <FormField
        label="Payment method"
        value={form.paymentMethod}
        onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
      />
      <FormField
        label="Note"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        style={{ gridColumn: "1 / -1" }}
      />
    </div>
  );
}
