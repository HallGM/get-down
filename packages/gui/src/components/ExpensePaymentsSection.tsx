import { useState } from "react";
import type { Expense, ExpensePayment } from "@get-down/shared";
import { useAccounts } from "../api/hooks/useAccounts.js";
import { useExpensePayments, useUpdatePayment, useUpdatePaymentShares, useCreatePayment, useDeletePayment, useDeletePaymentShare, useEligiblePaymentExpenses } from "../api/hooks/useExpensePayments.js";
import { ExpensePaymentSharesFields, PaymentFormFields, EMPTY_PAYMENT_FORM, toCreatePaymentRequest, toUpdatePaymentRequest, type PaymentFormState } from "./ExpensePaymentFormFields.js";
import MoneyDisplay from "./MoneyDisplay.js";
import PaymentStatusBadge from "./PaymentStatusBadge.js";
import { formatDate, toInputDate } from "../utils/date.js";
import ConfirmDelete from "./ConfirmDelete.js";
import { formatPaymentAmount } from "../utils/money.js";

interface Props {
  expenseId: number;
  amount: number;
  paymentStatus: Expense["paymentStatus"];
}

export default function ExpensePaymentsSection({ expenseId, amount, paymentStatus }: Props) {
  const { data: payments = [], isLoading } = useExpensePayments(expenseId);
  const { data: accounts = [] } = useAccounts();
  const { data: eligibleExpenses = [], isLoading: eligibleExpensesLoading, isError: eligibleExpensesError } = useEligiblePaymentExpenses();
  const updatePayment = useUpdatePayment();
  const updateShares = useUpdatePaymentShares();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const deleteShare = useDeletePaymentShare();
  const [form, setForm] = useState<PaymentFormState>(EMPTY_PAYMENT_FORM);
  const [formShares, setFormShares] = useState<Array<{ expenseId: number; amount: number }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExpensePayment | null>(null);
  const [editMode, setEditMode] = useState<"details" | "shares" | null>(null);
  const [shares, setShares] = useState<Array<{ expenseId: number; amount: number }>>([]);
  const [deleteTarget, setDeleteTarget] = useState<ExpensePayment | null>(null);
  const accountMap = new Map(accounts.map((account) => [account.id, account.personName]));

  function updateCreateForm(setter: (fn: (state: PaymentFormState) => PaymentFormState) => void, updater: (state: PaymentFormState) => PaymentFormState) {
    setter((current) => {
      const next = updater(current);
      setFormShares((currentShares) => currentShares.length === 1 && currentShares[0].expenseId === expenseId
        ? [{ ...currentShares[0], amount: next.amount }]
        : currentShares);
      return next;
    });
  }

  return <div style={{ marginTop: "1.5rem" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}><strong>Payments</strong><PaymentStatusBadge status={paymentStatus} /></div>
      {!showForm && !editing && paymentStatus !== "taxOnly" && <button type="button" className="secondary outline" onClick={() => {
        setForm(EMPTY_PAYMENT_FORM);
        setFormShares([{ expenseId, amount }]);
        setShowForm(true);
      }}>+ Add Payment</button>}
    </div>
    {paymentStatus === "taxOnly" && <p>This is a personal cost claimed for tax purposes only. No payment shares are allowed.</p>}
    {isLoading ? <p>Loading payments…</p> : payments.length === 0 && !showForm ? <p>No payments recorded yet.</p> : payments.map((payment) => (
      <article key={payment.id} style={{ marginBottom: "0.5rem" }}>
        {editing?.id === payment.id && editMode === "details" ? <>
          <PaymentFormFields form={form} setForm={setForm} accounts={accounts} />
          <button type="button" onClick={async () => { await updatePayment.mutateAsync({ paymentId: payment.id, input: toUpdatePaymentRequest(form) }); setEditing(null); }}>Save details</button>
          <button type="button" className="secondary" onClick={() => { setEditing(null); setEditMode(null); }}>Cancel</button>
        </> : <>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <strong><MoneyDisplay pennies={payment.amount} /></strong><span>{payment.date ? formatDate(payment.date) : "—"}</span>
            <span>{accountMap.get(payment.accountId) ?? "Unknown"}</span><button type="button" onClick={() => {
              setEditing(payment);
              setEditMode("details");
              setForm({ accountId: payment.accountId, amount: payment.amount, date: toInputDate(payment.date), paymentMethod: payment.paymentMethod ?? "", description: payment.description ?? "" });
            }}>Edit details</button>
            <button type="button" className="contrast outline" onClick={() => setDeleteTarget(payment)}>Delete payment</button>
          </div>
          <div>{payment.shares.map((share) => <div key={share.expenseId} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span>{share.expenseDescription}</span><MoneyDisplay pennies={share.amount} />
            <button type="button" className="contrast outline" onClick={async () => { await deleteShare.mutateAsync({ paymentId: payment.id, expenseId: share.expenseId }); }}>Remove share</button>
          </div>)}</div>
          <button type="button" className="secondary outline" onClick={() => { setEditing(payment); setEditMode("shares"); setShares(payment.shares.map(({ expenseId: id, amount: shareAmount }) => ({ expenseId: id, amount: shareAmount }))); }}>Edit shares</button>
          {editing?.id === payment.id && editMode === "shares" && <div>
            <h4>Manage expense shares</h4>
            <ExpensePaymentSharesFields
              paymentAmount={payment.amount}
              eligibleExpenses={eligibleExpenses}
              eligibleExpensesLoading={eligibleExpensesLoading}
              eligibleExpensesError={eligibleExpensesError}
              shares={shares}
              setShares={setShares}
              existingExpenses={payment.shares}
            />
            <button type="button" onClick={async () => { await updateShares.mutateAsync({ paymentId: payment.id, input: { shares } }); setEditing(null); setEditMode(null); }}>Save shares</button>
            <button type="button" onClick={() => { setEditing(null); setEditMode(null); }}>Cancel</button>
          </div>}
        </>}
      </article>
    ))}
    {showForm && <div>
      <PaymentFormFields form={form} setForm={(updater) => updateCreateForm(setForm, updater)} accounts={accounts} eligibleExpenses={eligibleExpenses} eligibleExpensesLoading={eligibleExpensesLoading} eligibleExpensesError={eligibleExpensesError} shares={formShares} setShares={setFormShares} />
      <button type="button" disabled={!form.accountId || createPayment.isPending} onClick={async () => { await createPayment.mutateAsync(toCreatePaymentRequest(form, formShares)); setShowForm(false); }}>Record payment</button>
      <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
    </div>}
    {deleteTarget && <ConfirmDelete open itemName={formatPaymentAmount(deleteTarget.amount)} loading={deletePayment.isPending} onCancel={() => setDeleteTarget(null)} onConfirm={async () => {
      try { await deletePayment.mutateAsync(deleteTarget.id); }
      finally { setDeleteTarget(null); }
    }} />}
  </div>;
}
