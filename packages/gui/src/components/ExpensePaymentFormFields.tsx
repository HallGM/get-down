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

interface Props {
  form: PaymentFormState;
  setForm: (fn: (f: PaymentFormState) => PaymentFormState) => void;
  accounts: { id: number; personName: string }[];
}

export function PaymentFormFields({ form, setForm, accounts }: Props) {
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
