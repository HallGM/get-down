import Badge from "./Badge.js";

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
  const bg = PALETTE[status.toLowerCase()] ?? "#6c757d";
  return <Badge label={status} background={bg} style={{ textTransform: "capitalize" }} />;
}
