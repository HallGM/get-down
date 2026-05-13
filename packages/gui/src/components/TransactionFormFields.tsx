import FormField from "./FormField.js";
import MoneyField from "./MoneyField.js";
import { TRANSACTION_TYPES } from "../constants/transactionTypes.js";

export interface TransactionFormState {
  date: string;
  amount: number;
  type: string;
  description: string;
}

interface Props {
  form: TransactionFormState;
  setForm: React.Dispatch<React.SetStateAction<TransactionFormState>>;
  /** Whether the date field is required. Defaults to false. */
  dateRequired?: boolean;
}

export default function TransactionFormFields({ form, setForm, dateRequired }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
      <FormField
        label="Date"
        type="date"
        value={form.date}
        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        required={dateRequired}
      />
      <MoneyField
        label="Amount"
        hint="negative = credit to person"
        value={form.amount}
        onChange={(pennies) => setForm((f) => ({ ...f, amount: pennies ?? 0 }))}
        required
      />
      <FormField
        as="select"
        label="Type"
        value={form.type}
        onChange={(e) => setForm((f) => ({ ...f, type: (e.target as HTMLSelectElement).value }))}
        required
      >
        {TRANSACTION_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </FormField>
      <FormField
        label="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      />
    </div>
  );
}
