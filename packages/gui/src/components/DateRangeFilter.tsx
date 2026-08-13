import { useState, useEffect } from "react";

interface DateRangeFilterProps {
  label: string;
  start: string | null;
  end: string | null;
  onChange: (start: string | null, end: string | null) => void;
}

export default function DateRangeFilter({ label, start, end, onChange }: DateRangeFilterProps) {
  // Track local state while editing to avoid triggering queries on every arrow press
  const [localStart, setLocalStart] = useState<string>(start || "");
  const [localEnd, setLocalEnd] = useState<string>(end || "");

  // Sync local state when props change (e.g., when a year is selected)
  useEffect(() => {
    setLocalStart(start || "");
    setLocalEnd(end || "");
  }, [start, end]);

  const handleStartBlur = () => {
    onChange(localStart || null, end);
  };

  const handleEndBlur = () => {
    onChange(start, localEnd || null);
  };

  // Only validate once a date is committed (not during editing)
  const isInvalid = (localStart && localEnd && localStart > localEnd) || (!!localStart && !localEnd) || (!localStart && !!localEnd);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
      <input
        type="date"
        value={localStart}
        onChange={(e) => setLocalStart(e.target.value)}
        onBlur={handleStartBlur}
        style={{
          width: "auto",
          marginBottom: 0,
          borderColor: isInvalid ? "var(--pico-form-element-invalid-border-color)" : undefined,
        }}
        aria-label="Start date"
      />
      <span style={{ whiteSpace: "nowrap" }}>to</span>
      <input
        type="date"
        value={localEnd}
        onChange={(e) => setLocalEnd(e.target.value)}
        onBlur={handleEndBlur}
        style={{
          width: "auto",
          marginBottom: 0,
          borderColor: isInvalid ? "var(--pico-form-element-invalid-border-color)" : undefined,
        }}
        aria-label="End date"
      />
      {isInvalid && (
        <span
          style={{
            color: "var(--pico-form-element-invalid-border-color)",
            fontSize: "0.875rem",
            marginLeft: "0.5rem",
          }}
        >
          {!start && end ? "Start date required" : !end && start ? "End date required" : "Start date must be before end date"}
        </span>
      )}
    </div>
  );
}
