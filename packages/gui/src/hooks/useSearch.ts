import { useState, useMemo } from "react";

/**
 * Pairs a search string state with a memoised filtered view of `data`.
 *
 * `filterFn` receives each item and the trimmed, lowercased query string.
 * Define it at module scope (or wrap in useCallback) so its reference is
 * stable and the memo doesn't re-run on every render.
 */
export function useSearch<T>(
  data: T[],
  filterFn: (item: T, q: string) => boolean,
): { search: string; setSearch: (value: string) => void; displayed: T[] } {
  const [search, setSearch] = useState("");

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) => filterFn(item, q));
  }, [data, search, filterFn]);

  return { search, setSearch, displayed };
}
