interface BadgeProps {
  label: string;
  background: string;
  /** Defaults to "#fff". Pass "inherit" for dark-on-light variants. */
  color?: string;
  /** Defaults to "0.8em". */
  fontSize?: string;
  /** Escape hatch for one-off style overrides (padding, fontWeight, border, etc.). */
  style?: React.CSSProperties;
}

export default function Badge({ label, background, color = "#fff", fontSize = "0.8em", style }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1em 0.5em",
        borderRadius: "0.25em",
        background,
        color,
        fontSize,
        fontWeight: 600,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
    </span>
  );
}
