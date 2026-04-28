interface Props {
  value?: number; // total seconds
  onChange: (seconds: number | undefined) => void;
}

/**
 * Controlled split min/sec input for entering durations.
 * Props: value (seconds), onChange (fires undefined when both fields are cleared).
 */
export default function DurationInput({ value, onChange }: Props) {
  const minutes = value !== undefined ? Math.floor(value / 60) : undefined;
  const seconds = value !== undefined ? value % 60 : undefined;

  function handleMinutes(raw: string) {
    const m = raw === "" ? undefined : Math.max(0, parseInt(raw, 10));
    const s = seconds ?? 0;
    if (m === undefined && s === 0) { onChange(undefined); return; }
    onChange((m ?? 0) * 60 + s);
  }

  function handleSeconds(raw: string) {
    const s = raw === "" ? undefined : Math.min(59, Math.max(0, parseInt(raw, 10)));
    const m = minutes ?? 0;
    if (m === 0 && s === undefined) { onChange(undefined); return; }
    onChange(m * 60 + (s ?? 0));
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
      <input
        type="number"
        min={0}
        placeholder="0"
        value={minutes ?? ""}
        onChange={e => handleMinutes(e.target.value)}
        style={{ width: "4.5rem", textAlign: "right" }}
        aria-label="Minutes"
      />
      <span style={{ fontWeight: 600 }}>m</span>
      <input
        type="number"
        min={0}
        max={59}
        placeholder="00"
        value={seconds ?? ""}
        onChange={e => handleSeconds(e.target.value)}
        style={{ width: "4.5rem", textAlign: "right" }}
        aria-label="Seconds"
      />
      <span style={{ fontWeight: 600 }}>s</span>
    </div>
  );
}
