/**
 * Returns true when either `typeOrLabel` or `description` contains the query
 * string (case-insensitive, partial match).
 *
 * `q` may be raw user input or already lowercased — both are handled correctly.
 */
export function matchesTypeAndDescription(
  typeOrLabel: string,
  description: string | undefined,
  q: string,
): boolean {
  const lq = q.toLowerCase();
  return typeOrLabel.toLowerCase().includes(lq) || (description ?? "").toLowerCase().includes(lq);
}
