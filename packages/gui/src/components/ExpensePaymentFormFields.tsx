import type { CreateExpensePaymentRequest, UpdateExpensePaymentRequest } from "@get-down/shared";
import MoneyField from "./MoneyField.js";
import FormField from "./FormField.js";

export interface PaymentFormState {
  accountId: number | "";
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
}

export const EMPTY_PAYMENT_FORM: PaymentFormState = {
  accountId: "",
  amount: 0,
  date: "",
  paymentMethod: "",
  description: "",
};

export function toCreatePaymentRequest(
  form: PaymentFormState,
  shares: Array<{ expenseId: number; amount: number }>,
): CreateExpensePaymentRequest {
  return {
    accountId: Number(form.accountId),
    amount: form.amount,
    date: form.date || undefined,
    paymentMethod: form.paymentMethod || undefined,
    description: form.description || undefined,
    shares,
  };
}

export function toUpdatePaymentRequest(form: PaymentFormState): UpdateExpensePaymentRequest {
  return {
    accountId: Number(form.accountId),
    amount: form.amount,
    date: form.date || undefined,
    paymentMethod: form.paymentMethod || undefined,
    description: form.description || undefined,
  };
}

interface Props {
  form: PaymentFormState;
  setForm: (fn: (f: PaymentFormState) => PaymentFormState) => void;
  accounts: { id: number; personName: string }[];
  eligibleExpenses?: { id: number; description: string; amount: number }[];
  shares?: { expenseId: number; amount: number }[];
  setShares?: (shares: { expenseId: number; amount: number }[]) => void;
}

export function PaymentFormFields({ form, setForm, accounts, eligibleExpenses, shares, setShares }: Props) {
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
      {eligibleExpenses !== undefined && shares && setShares && (
        <ExpensePaymentSharesFields
          paymentAmount={form.amount}
          eligibleExpenses={eligibleExpenses}
          shares={shares}
          setShares={setShares}
        />
      )}
    </div>
  );
}

interface SharesFieldsProps {
  paymentAmount: number;
  eligibleExpenses: { id: number; description: string; amount: number }[] | null;
  shares: { expenseId: number; amount: number }[];
  setShares: (shares: { expenseId: number; amount: number }[]) => void;
  existingExpenses?: { expenseId: number; expenseDescription: string }[];
}

export function ExpensePaymentSharesFields({ paymentAmount, eligibleExpenses, shares, setShares, existingExpenses = [] }: SharesFieldsProps) {
  const availableExpenses = Array.isArray(eligibleExpenses) ? eligibleExpenses : [];
  const assigned = shares.reduce((total, share) => total + share.amount, 0);

  function addShare() {
    const expense = availableExpenses.find((item) => !shares.some((share) => share.expenseId === item.id));
    if (expense) setShares([...shares, { expenseId: expense.id, amount: 0 }]);
  }

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <strong>Expense shares</strong>
      {shares.length === 0 && <p>No expense shares assigned yet.</p>}
      {availableExpenses.length === 0 && <p>No eligible expenses are currently available.</p>}
      {shares.map((share) => (
        <div key={share.expenseId} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.5rem", alignItems: "end", marginTop: "0.5rem" }}>
          <label>
            <small><strong>Expense</strong></small>
            <select
              aria-label="Expense"
              value={share.expenseId}
            onChange={(event) => setShares(shares.map((item) => Number(item.expenseId) === Number(share.expenseId) ? { ...item, expenseId: Number(event.target.value) } : item))}
              style={{ marginTop: "0.25rem" }}
            >
              {!availableExpenses.some((expense) => Number(expense.id) === Number(share.expenseId)) && (
                <option value={share.expenseId}>
                  {existingExpenses.find((expense) => Number(expense.expenseId) === Number(share.expenseId))?.expenseDescription ?? `Expense #${share.expenseId} (unavailable)`}
                </option>
              )}
              {availableExpenses
                .filter((expense) => Number(expense.id) === Number(share.expenseId) || !shares.some((item) => Number(item.expenseId) === Number(expense.id)))
                .map((expense) => <option key={expense.id} value={expense.id}>{expense.description}</option>)}
            </select>
          </label>
          <MoneyField
            label="Share"
            value={share.amount}
            onChange={(amount) => setShares(shares.map((item) => item.expenseId === share.expenseId ? { ...item, amount: amount ?? 0 } : item))}
          />
          <button type="button" className="contrast outline" onClick={() => setShares(shares.filter((item) => item.expenseId !== share.expenseId))}>Remove</button>
        </div>
      ))}
      <button type="button" className="secondary outline" style={{ marginTop: "0.5rem" }} disabled={availableExpenses.length <= shares.length} onClick={addShare}>
        + Add expense share
      </button>
      <p style={{ margin: "0.5rem 0 0", color: "var(--pico-muted-color)" }}>
        Remaining unassigned: <strong>£{paymentAmount - assigned < 0 ? "-" : ""}{(Math.abs(paymentAmount - assigned) / 100).toFixed(2)}</strong>
      </p>
    </div>
  );
}
