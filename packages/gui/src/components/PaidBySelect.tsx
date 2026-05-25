import type { Account } from "@get-down/shared";

interface Props {
  accounts: Account[] | undefined;
  value: number | null | undefined;
  onChange: (id: number | null) => void;
}

export default function PaidBySelect({ accounts, value, onChange }: Props) {
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <label>
        <small><strong>Paid by</strong></small>
        <small style={{ color: "var(--pico-muted-color)", marginLeft: "0.5em" }}>
          optional, leave blank if paid by the business
        </small>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          style={{ marginTop: "0.25rem" }}
        >
          <option value="">Business (default)</option>
          {(accounts ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.personName}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
