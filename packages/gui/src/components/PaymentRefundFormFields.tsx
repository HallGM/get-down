import FormField from "./FormField.js";
import MoneyField from "./MoneyField.js";
import PartnerAccountSelect from "./PartnerAccountSelect.js";

export interface PaymentRefundFormState {
  amount: number;
  date: string;
  method: string;
  description: string;
  receivedByAccountId?: number | null;
}

interface Props {
  form: PaymentRefundFormState;
  setForm: React.Dispatch<React.SetStateAction<PaymentRefundFormState>>;
  accounts?: { id: number; personName: string }[];
}

export default function PaymentRefundFormFields({ form, setForm, accounts }: Props) {
  return (
    <>
      <MoneyField
        label="Amount"
        value={form.amount}
        onChange={(pennies) => setForm((f) => ({ ...f, amount: pennies ?? 0 }))}
        required
        min={0}
      />
      <FormField
        label="Date"
        type="date"
        value={form.date}
        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
      />
      <FormField
        label="Method"
        value={form.method}
        onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
        placeholder="e.g. Bank transfer"
      />
      <FormField
        label="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      />
      {accounts && (
        <PartnerAccountSelect
          value={form.receivedByAccountId ?? null}
          accounts={accounts}
          onChange={(id) => setForm((f) => ({ ...f, receivedByAccountId: id }))}
        />
      )}
    </>
  );
}
