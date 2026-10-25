import type { ExpensePaymentSummary } from "@get-down/shared";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import DateCell from "../../components/DateCell.js";
import { useState } from "react";
import { useAccounts } from "../../api/hooks/useAccounts.js";
import { useEligiblePaymentExpenses, useUpdatePayment, useUpdatePaymentShares, useDeletePayment } from "../../api/hooks/useExpensePayments.js";
import { ExpensePaymentSharesFields, PaymentFormFields, EMPTY_PAYMENT_FORM, toUpdatePaymentRequest, type PaymentFormState } from "../../components/ExpensePaymentFormFields.js";

interface Props { payment: ExpensePaymentSummary; }

export default function ExpensePaymentRow({ payment }: Props) {
  const { data: accounts = [] } = useAccounts();
  const { data: eligibleExpenses = [] } = useEligiblePaymentExpenses();
  const updatePayment = useUpdatePayment();
  const updateShares = useUpdatePaymentShares();
  const deletePayment = useDeletePayment();
  const [mode, setMode] = useState<"details" | "shares" | null>(null);
  const [form, setForm] = useState<PaymentFormState>({ accountId: payment.accountId, amount: payment.amount, date: payment.date ?? "", paymentMethod: payment.paymentMethod ?? "", description: payment.description ?? "" });
  const [shares, setShares] = useState(payment.shares.map(({ expenseId, amount }) => ({ expenseId, amount })));
  return <>
  <tr>
    <td style={{ whiteSpace: "nowrap" }}><DateCell date={payment.date} /></td>
    <td>
      {payment.shares.length ? (
        <ul className="expense-payment-shares-list">
          {payment.shares.map((share) => (
            <li key={share.expenseId} className="expense-payment-share-summary">
              <span>{share.expenseDescription}</span>
              <MoneyDisplay pennies={share.amount} />
            </li>
          ))}
        </ul>
      ) : <span className="expense-payment-unassigned">Unassigned</span>}
    </td>
    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}><MoneyDisplay pennies={payment.amount} /></td>
    <td>{payment.paidForBy}</td>
    <td style={{ textAlign: "right", whiteSpace: "nowrap", color: payment.mismatch === 0 ? "inherit" : "var(--pico-del-color, #dc3545)" }}>
      <MoneyDisplay pennies={payment.assignedTotal} />{payment.mismatch !== 0 && ` (${payment.mismatch > 0 ? "unassigned " : "over "}${(Math.abs(payment.mismatch) / 100).toFixed(2)})`}
    </td>
    <td className="expense-payment-actions-cell">
      <div className="expense-payment-actions">
        <button
          type="button"
          className="secondary outline expense-payment-icon-button"
          aria-label={`Edit payment details for ${payment.id}`}
          title="Edit payment details"
          onClick={() => setMode(mode === "details" ? null : "details")}
        >✎</button>
        <button
          type="button"
          className="secondary outline expense-payment-icon-button"
          aria-label={`Manage expense shares for payment ${payment.id}`}
          title="Manage expense shares"
          onClick={() => setMode(mode === "shares" ? null : "shares")}
        >↔</button>
        <button
          type="button"
          className="contrast outline expense-payment-icon-button"
          aria-label={`Delete payment ${payment.id}`}
          title="Delete payment"
          onClick={async () => { await deletePayment.mutateAsync(payment.id); }}
        >✕</button>
      </div>
    </td>
  </tr>
  {mode && <tr><td colSpan={6}>
    {mode === "details" ? <>
      <h3>Edit payment details</h3>
      <PaymentFormFields form={form} setForm={setForm} accounts={accounts} />
      <button type="button" onClick={async () => { await updatePayment.mutateAsync({ paymentId: payment.id, input: toUpdatePaymentRequest(form) }); setMode(null); }}>Save details</button>
    </> : <>
      <h3>Manage expense shares</h3>
      <ExpensePaymentSharesFields
        paymentAmount={payment.amount}
        eligibleExpenses={eligibleExpenses}
        shares={shares}
        setShares={setShares}
        existingExpenses={payment.shares}
      />
      <button type="button" onClick={async () => { await updateShares.mutateAsync({ paymentId: payment.id, input: { shares } }); setMode(null); }}>Save shares</button>
    </>}
    <button type="button" className="secondary" onClick={() => setMode(null)}>Cancel</button>
  </td></tr>}
  </>;
}
