import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FeeAllocationSummary } from "@get-down/shared";
import { useFeeAllocationSummaries } from "../../api/hooks/useFeeAllocations.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import EmptyState from "../../components/EmptyState.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import BooleanCell from "../../components/BooleanCell.js";
import AllocationEventCell from "../../components/AllocationEventCell.js";
import YearSelect from "../../components/YearSelect.js";
import CountBadge from "../../components/CountBadge.js";
import { formatDate } from "../../utils/date.js";
import { useYearFilterData } from "../../hooks/useYearFilter.js";
import RunningTotal from "../../components/RunningTotal.js";

// ─── Person filter ─────────────────────────────────────────────────────────────

type FilterValue = "all" | "none" | number;

interface PersonOption {
  value: FilterValue;
  label: string;
}

function buildPersonOptions(allocations: FeeAllocationSummary[]): PersonOption[] {
  const seen = new Map<number, string>();
  for (const a of allocations) {
    if (a.personId !== undefined && !seen.has(a.personId)) {
      seen.set(a.personId, a.personName ?? `Person #${a.personId}`);
    }
  }
  const sorted = [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  return [
    { value: "all", label: "All people" },
    ...sorted.map(([id, name]) => ({ value: id as FilterValue, label: name })),
    { value: "none", label: "No person assigned" },
  ];
}

function applyFilter(allocations: FeeAllocationSummary[], filter: FilterValue): FeeAllocationSummary[] {
  if (filter === "all") return allocations;
  if (filter === "none") return allocations.filter((a) => a.personId === undefined);
  return allocations.filter((a) => a.personId === filter);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeeAllocationsList() {
  const { data: allocations = [], isLoading, error } = useFeeAllocationSummaries();
  const [personFilter, setPersonFilter] = useState<FilterValue>("all");
  const {
    calendarYear, taxYear, setCalendarYear, setTaxYear,
    calendarYearOptions, taxYearOptions,
    filtered: yearFiltered,
  } = useYearFilterData(allocations, (a) => a.eventDate);
  const navigate = useNavigate();

  const personOptions = useMemo(() => buildPersonOptions(allocations), [allocations]);

  const filtered = useMemo(() => applyFilter(yearFiltered, personFilter), [yearFiltered, personFilter]);

  const total = useMemo(() => filtered.reduce((sum, a) => sum + a.totalFee, 0), [filtered]);

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error)     return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Fee Allocations</h1>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <YearSelect
          label="Year:"
          value={calendarYear ?? ""}
          options={calendarYearOptions}
          onChange={setCalendarYear}
        />
        <YearSelect
          label="Tax year:"
          value={taxYear ?? ""}
          options={taxYearOptions}
          onChange={setTaxYear}
        />
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
          <span style={{ color: "var(--pico-muted-color)", fontSize: "0.9em", whiteSpace: "nowrap" }}>Person:</span>
          <select
            value={String(personFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setPersonFilter(v === "all" ? "all" : v === "none" ? "none" : Number(v));
            }}
            style={{ margin: 0 }}
          >
            {personOptions.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <CountBadge count={filtered.length} noun="allocation" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No fee allocations found." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Event</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Fee</th>
                <th style={{ textAlign: "center" }}>Invoiced</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const href = a.gigId
                  ? `/gigs/${a.gigId}/roles`
                  : a.showcaseId
                    ? `/showcases/${a.showcaseId}`
                    : null;
                return (
                  <tr
                    key={a.id}
                    onClick={() => href && navigate(href)}
                    style={href ? { cursor: "pointer" } : undefined}
                  >
                    <td>
                      {a.personName ?? (
                        <span style={{ color: "var(--pico-muted-color)" }}>Unassigned</span>
                      )}
                    </td>
                    <td><AllocationEventCell eventName={a.eventName} gigId={a.gigId} showcaseId={a.showcaseId} /></td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(a.eventDate)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <MoneyDisplay pennies={a.totalFee} />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <BooleanCell value={a.isInvoiced} />
                    </td>
                    <td style={{ color: a.notes ? undefined : "var(--pico-muted-color)" }}>
                      {a.notes ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Total */}
      <RunningTotal pennies={total} />
    </main>
  );
}
