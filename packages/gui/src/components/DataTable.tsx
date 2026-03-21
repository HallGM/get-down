import { type ReactNode, useState } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  filterPlaceholder?: string;
  filterFn?: (row: T, query: string) => boolean;
}

export default function DataTable<T extends object>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No items found.",
  filterPlaceholder = "Search…",
  filterFn,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const defaultFilter = (row: T, q: string) =>
    Object.values(row as Record<string, unknown>).some((v) =>
      String(v ?? "").toLowerCase().includes(q.toLowerCase())
    );

  let rows = filterFn
    ? data.filter((r) => filterFn(r, query))
    : query
      ? data.filter((r) => defaultFilter(r, query))
      : data;

  if (sortKey) {
    rows = [...rows].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <>
      {filterFn !== null && (
        <input
          type="search"
          placeholder={filterPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: "var(--pico-spacing)" }}
        />
      )}
      <figure style={{ overflowX: "auto", margin: 0 }}>
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  style={col.sortable ? { cursor: "pointer", userSelect: "none" } : undefined}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <span aria-hidden> {sortDir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", color: "var(--pico-muted-color)" }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: "pointer" } : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </figure>
    </>
  );
}
