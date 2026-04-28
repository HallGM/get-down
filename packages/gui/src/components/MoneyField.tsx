import type { InputHTMLAttributes } from "react";
import FormField from "./FormField.js";
import { penniesToPounds, poundsToPennies } from "../utils/money.js";

type OmittedInputProps = "type" | "step" | "value" | "onChange";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, OmittedInputProps> {
  label: string;
  hint?: string;
  error?: string;
  value: number | undefined;
  onChange: (pennies: number | undefined) => void;
}

/**
 * A money input that accepts pounds from the user (e.g. "12.50") and
 * converts to/from integer pence for the parent's state.
 *
 * - `value` is pence (or undefined for an empty/optional field).
 * - `onChange` is called with pence (or undefined when the field is cleared).
 */
export default function MoneyField({ value, onChange, label, ...rest }: Props) {
  const displayValue = value != null ? penniesToPounds(value) : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === "") {
      onChange(undefined);
      return;
    }
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(poundsToPennies(parsed));
  }

  return (
    <FormField
      {...rest}
      label={`${label} (£)`}
      type="number"
      step={0.01}
      value={displayValue}
      onChange={handleChange}
    />
  );
}
