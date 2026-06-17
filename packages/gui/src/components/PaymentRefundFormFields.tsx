import FormField from "./FormField.js";
import MoneyField from "./MoneyField.js";
import PartnerAccountSelect from "./PartnerAccountSelect.js";
import { REFUND_SUBTYPE_DEFAULT } from "@get-down/shared";

export interface PaymentRefundFormState {
  amount: number;
  date: string;
  method: string;
  description: string;
  receivedByAccountId?: number | null;
  subtype?: 'credit' | 'adjustment';
}

interface Props {
  form: PaymentRefundFormState;
  setForm: React.Dispatch<React.SetStateAction<PaymentRefundFormState>>;
  accounts?: { id: number; personName: string }[];
  showSubtype?: boolean;
}

export default function PaymentRefundFormFields({ form, setForm, accounts, showSubtype }: Props) {
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
      {showSubtype && (
        <fieldset>
          <legend>Type</legend>
          <label>
            <input
              type="radio"
              name="subtype"
              value="adjustment"
              checked={(form.subtype ?? REFUND_SUBTYPE_DEFAULT) === 'adjustment'}
              onChange={() => setForm((f) => ({ ...f, subtype: REFUND_SUBTYPE_DEFAULT }))}
            />
            Adjustment
          </label>
          <small>A correction for a client who has overpaid, for example after a service is removed.</small>
          <label>
            <input
              type="radio"
              name="subtype"
              value="credit"
              checked={(form.subtype ?? REFUND_SUBTYPE_DEFAULT) === 'credit'}
              onChange={() => setForm((f) => ({ ...f, subtype: 'credit' }))}
            />
            Credit
          </label>
          <small>A goodwill gesture that reduces the amount charged.</small>
        </fieldset>
      )}
    </>
  );
}
