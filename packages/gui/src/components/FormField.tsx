import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
}

interface InputProps extends BaseProps, InputHTMLAttributes<HTMLInputElement> {
  as?: "input";
}

interface SelectProps extends BaseProps, SelectHTMLAttributes<HTMLSelectElement> {
  as: "select";
  children: ReactNode;
}

interface TextareaProps extends BaseProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  as: "textarea";
}

type Props = InputProps | SelectProps | TextareaProps;

export default function FormField(props: Props) {
  const { label, hint, error } = props;
  const as = props.as ?? "input";
  const { label: _l, hint: _h, error: _e, as: _a, ...rest } = props as unknown as Record<string, unknown>;

  return (
    <label>
      {label}
      {hint && <small style={{ marginLeft: "0.5em", color: "var(--pico-muted-color)" }}>{hint}</small>}
      {as === "select" ? (
        <select aria-invalid={error ? "true" : undefined} {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}>
          {(props as SelectProps).children}
        </select>
      ) : as === "textarea" ? (
        <textarea aria-invalid={error ? "true" : undefined} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input aria-invalid={error ? "true" : undefined} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {error && <small style={{ color: "var(--pico-del-color)" }}>{error}</small>}
    </label>
  );
}

