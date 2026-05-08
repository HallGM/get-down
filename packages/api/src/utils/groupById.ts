/**
 * Build a Map grouping rows by a key, collecting values per group.
 * Replaces repeated map-building loops across repository files.
 *
 * @example
 * const map = groupById(rows, (r) => r.allocation_id, (r) => r.expense_id);
 */
export function groupById<TRow, TKey, TVal>(
  rows: TRow[],
  keyFn: (row: TRow) => TKey,
  valFn: (row: TRow) => TVal
): Map<TKey, TVal[]> {
  const map = new Map<TKey, TVal[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const list = map.get(key) ?? [];
    list.push(valFn(row));
    map.set(key, list);
  }
  return map;
}
