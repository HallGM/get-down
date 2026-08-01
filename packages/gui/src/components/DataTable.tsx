import { type CSSProperties, type ReactNode, useState } from "react";
import LinkCell from "./LinkCell.js";

export interface Column<T> {
  key: string;
  header: string;
  /** When present, a ⓘ indicator with a native browser tooltip appears next to the header text. */
  headerHint?: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  /** When true, this column's cells will not be wrapped in a link, allowing interactive
   *  elements (buttons, nested links) to work standalone. */
  interactive?: boolean;
  /** Inline style applied to every `<td>` in this column (e.g. alignment, whitespace, formatting). */
  cellStyle?: CSSProperties;
  /** Inline style applied to this column's `<th>` (e.g. alignment to match cellStyle). */
  headerStyle?: CSSProperties;
}

export function defaultFilter<T extends object>(row: T, q: string): boolean {
  return Object.values(row as Record<string, unknown>).some((v) =>
    String(v ?? "").toLowerCase().includes(q.toLowerCase())
  );
}

/**
 * Multi-word filter: every term in the query must match at least one value.
 * Terms are matched case-insensitively as substrings.
 * Empty query returns true (no filtering).
 */
export function multiWordFilter(query: string, values: (string | null | undefined)[]): boolean {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const normalizedValues = values.map((v) => String(v ?? "").toLowerCase());
  return terms.every((term) =>
    normalizedValues.some((val) => val.includes(term.toLowerCase()))
  );
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  /** When provided, rows become real links pointing to this href. When a row has a rowHref,
   *  onRowClick is ignored. Columns with interactive: true are not wrapped in the link. */
  rowHref?: (row: T) => string | undefined;
  emptyMessage?: string;
  filterPlaceholder?: string;
  filterFn?: (row: T, query: string) => boolean;
  /** Controlled search query. When provided together with onQueryChange, the
   *  component delegates query state to the parent instead of managing it internally. */
  query?: string;
  /** Called when the search input changes in controlled mode. */
  onQueryChange?: (q: string) => void;
  /** When true, the built-in search input is not rendered. Use this when the caller
   *  provides its own filter controls (e.g. custom search bars, year/person selects). */
  hideSearch?: boolean;
}

export default function DataTable<T extends object>({
  columns,
  data,
  onRowClick,
  rowHref,
  emptyMessage = "No items found.",
  filterPlaceholder = "Search…",
  filterFn,
  query: controlledQuery,
  onQueryChange,
  hideSearch = false,
}: Props<T>) {
  const [internalQuery, setInternalQuery] = useState("");

  // Use controlled mode when both props are provided; otherwise fall back to
  // internal state so all existing callers are unaffected.
  const query = controlledQuery !== undefined ? controlledQuery : internalQuery;
  function handleQueryChange(q: string) {
    if (onQueryChange !== undefined) {
      onQueryChange(q);
    } else {
      setInternalQuery(q);
    }
  }

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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
      {!hideSearch && filterFn !== null && (
        <input
          type="search"
          placeholder={filterPlaceholder}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
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
                  style={{
                    ...(col.sortable ? { cursor: "pointer", userSelect: "none" as const } : {}),
                    ...col.headerStyle,
                  }}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.header}
                  {col.headerHint && (
                    <span
                      title={col.headerHint}
                      style={{ cursor: "help", color: "var(--pico-muted-color)", fontSize: "0.85em", marginLeft: "0.3em" }}
                    >ⓘ</span>
                  )}
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
              rows.map((row, i) => {
                const href = rowHref ? rowHref(row) : undefined;
                return (
                  <tr
                    key={i}
                    onClick={onRowClick && !href ? () => onRowClick(row) : undefined}
                    style={onRowClick || href ? { cursor: "pointer" } : undefined}
                  >
                    {columns.map((col) => {
                      const isInteractive = col.interactive === true;
                      const cellContent = col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—");
                      
                      // If rowHref is provided and this column is not interactive, wrap content in a link
                      if (href && !isInteractive) {
                        return (
                          <LinkCell key={col.key} to={href} cellStyle={col.cellStyle}>
                            {cellContent}
                          </LinkCell>
                        );
                      }
                      
                      return (
                        <td key={col.key} style={col.cellStyle}>
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </figure>
    </>
  );
}
