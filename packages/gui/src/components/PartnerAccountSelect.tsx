interface PartnerAccountSelectProps {
  value: number | null;
  accounts: { id: number; personName: string }[];
  onChange: (id: number | null) => void;
}

export default function PartnerAccountSelect({ value, accounts, onChange }: PartnerAccountSelectProps) {
  return (
    <div>
      <label>
        Received by
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          style={{ marginTop: "0.25rem" }}
        >
          <option value="">Not set</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.personName}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
