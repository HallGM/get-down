import { useState } from "react";
import type { ExpensePayment, CreateExpensePaymentRequest, UpdateExpensePaymentRequest } from "@get-down/shared";
import { useAccounts } from "../api/hooks/useAccounts.js";
import {
  useExpensePayments,
  useCreateExpensePayment,
  useUpdateExpensePayment,
  useDeleteExpensePayment,
} from "../api/hooks/useExpensePayments.js";
import { PaymentFormFields, EMPTY_PAYMENT_FORM, type PaymentFormState } from "./ExpensePaymentFormFields.js";
import ConfirmDelete from "./ConfirmDelete.js";
import MoneyDisplay from "./MoneyDisplay.js";
import PaymentStatusBadge from "./PaymentStatusBadge.js";
import { formatDate, toInputDate } from "../utils/date.js";
import { formatPaymentAmount } from "../utils/money.js";


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
  const [form, setForm] = useState<PaymentFormState>(EMPTY_PAYMENT_FORM);
  const [editTarget, setEditTarget] = useState<ExpensePayment | null>(null);
  const [editForm, setEditForm] = useState<PaymentFormState>(EMPTY_PAYMENT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ExpensePayment | null>(null);

  const accountMap = new Map(accounts.map((a) => [a.id, a.personName]));

  async function handleCreate() {
    if (!form.accountId) return;
    const input: CreateExpensePaymentRequest = {
      accountId: Number(form.accountId),
      amount: form.amount,
      date: form.date || undefined,
      paymentMethod: form.paymentMethod || undefined,
      description: form.description || undefined,
    };
    try {
      await createPayment.mutateAsync(input);
      setShowForm(false);
      setForm(EMPTY_PAYMENT_FORM);
    } catch {
      // toast already shown by useApiMutation — keep form open for retry
    }
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

  async function handleUpdate() {
    if (!editTarget || !editForm.accountId) return;
    const input: UpdateExpensePaymentRequest = {
      accountId: Number(editForm.accountId),
      amount: editForm.amount,
      date: editForm.date || undefined,
      paymentMethod: editForm.paymentMethod || undefined,
      description: editForm.description || undefined,
    };
    try {
      await updatePayment.mutateAsync({ paymentId: editTarget.id, input });
      setEditTarget(null);
    } catch {
      // toast already shown by useApiMutation — keep edit form open for retry
    }
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
              <div key={p.id} style={{ border: "1px solid var(--pico-muted-border-color)", borderRadius: "var(--pico-border-radius)", padding: "0.75rem" }}>
                <PaymentFormFields form={editForm} setForm={setEditForm} accounts={accounts} />
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                  <button type="button" className="secondary outline" style={{ padding: "0.2em 0.6em" }} onClick={() => setEditTarget(null)}>Cancel</button>
                  <button type="button" style={{ padding: "0.2em 0.6em" }} aria-busy={updatePayment.isPending} disabled={updatePayment.isPending} onClick={handleUpdate}>Save</button>
                </div>
              </div>
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
        <div style={{ border: "1px solid var(--pico-muted-border-color)", borderRadius: "var(--pico-border-radius)", padding: "0.75rem", marginBottom: "0.5rem" }}>
          <PaymentFormFields form={form} setForm={setForm} accounts={accounts} />
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button type="button" className="secondary outline" style={{ padding: "0.2em 0.6em" }} onClick={() => { setShowForm(false); setForm(EMPTY_PAYMENT_FORM); }}>Cancel</button>
            <button type="button" style={{ padding: "0.2em 0.6em" }} aria-busy={createPayment.isPending} disabled={createPayment.isPending || !form.accountId} onClick={handleCreate}>Record Payment</button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
       {deleteTarget && (
         <ConfirmDelete
           open={!!deleteTarget}
           itemName={formatPaymentAmount(deleteTarget.amount)}
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
