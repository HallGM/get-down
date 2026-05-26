interface YearSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string | null) => void;
}

export default function YearSelect({ label, value, options, onChange }: YearSelectProps) {
  return (
    <label style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ width: "auto", marginBottom: 0 }}
      >
        <option value="">All</option>
        {options.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </label>
  );
}
