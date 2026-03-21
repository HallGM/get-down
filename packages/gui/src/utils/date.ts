/**
 * Format an ISO date string (YYYY-MM-DD) or Date object for display.
 * e.g. "2025-06-14" → "14 Jun 2025"
 */
export function formatDate(value: string | Date | undefined | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Return the YYYY-MM-DD string for use in <input type="date" />.
 */
export function toInputDate(value: string | Date | undefined | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
