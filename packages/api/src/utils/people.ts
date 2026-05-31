/** Builds a display name from a person row, preferring display_name over first+last. */
export function buildPersonName(row: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  return row.display_name
    ?? `${row.first_name ?? ""}${row.last_name ? ` ${row.last_name}` : ""}`.trim();
}
