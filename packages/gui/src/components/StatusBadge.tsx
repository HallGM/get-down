const PALETTE: Record<string, string> = {
  // Gig statuses
  enquiry: "#6c757d",
  confirmed: "#28a745",
  completed: "#17a2b8",
  cancelled: "#dc3545",
  postponed: "#fd7e14",
  // Todo states
  open: "#6c757d",
  "in-progress": "#007bff",
  done: "#28a745",
};

interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {
  const color = PALETTE[status.toLowerCase()] ?? "#6c757d";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1em 0.5em",
        borderRadius: "var(--pico-border-radius)",
        background: color,
        color: "#fff",
        fontSize: "0.8em",
        fontWeight: 600,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}
