import { useMemo, useState } from "react";
import type { FeeAllocationSummary } from "@get-down/shared";
import { useFeeAllocationSummaries, useConfirmFeeAllocation } from "../../api/hooks/useFeeAllocations.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import EmptyState from "../../components/EmptyState.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import BooleanCell from "../../components/BooleanCell.js";
import AllocationEventCell from "../../components/AllocationEventCell.js";
import YearSelect from "../../components/YearSelect.js";
import CountBadge from "../../components/CountBadge.js";
import DataTable, { type Column } from "../../components/DataTable.js";
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
  const confirmFeeAllocation = useConfirmFeeAllocation();
  const [personFilter, setPersonFilter] = useState<FilterValue>("all");
  const {
    calendarYear, taxYear, setCalendarYear, setTaxYear,
    calendarYearOptions, taxYearOptions,
    filtered: yearFiltered,
  } = useYearFilterData(allocations, (a) => a.eventDate);

  const personOptions = useMemo(() => buildPersonOptions(allocations), [allocations]);

  const filtered = useMemo(() => applyFilter(yearFiltered, personFilter), [yearFiltered, personFilter]);

  const total = useMemo(() => filtered.reduce((sum, a) => sum + a.totalFee, 0), [filtered]);

  const columns: Column<FeeAllocationSummary>[] = useMemo(() => [
    {
      key: "personName",
      header: "Person",
      render: (a) => a.personName ?? <span style={{ color: "var(--pico-muted-color)" }}>Unassigned</span>,
    },
    {
      key: "eventName",
      header: "Event",
      interactive: true, // AllocationEventCell renders its own link
      render: (a) => <AllocationEventCell eventName={a.eventName} gigId={a.gigId} showcaseId={a.showcaseId} />,
    },
    {
      key: "eventDate",
      header: "Date",
      cellStyle: { whiteSpace: "nowrap" },
      render: (a) => formatDate(a.eventDate),
    },
    {
      key: "totalFee",
      header: "Fee",
      headerStyle: { textAlign: "right" },
      cellStyle: { textAlign: "right", whiteSpace: "nowrap" },
      render: (a) => <MoneyDisplay pennies={a.totalFee} />,
    },
    {
      key: "isInvoiced",
      header: "Invoiced",
      headerStyle: { textAlign: "center" },
      cellStyle: { textAlign: "center" },
      render: (a) => <BooleanCell value={a.isInvoiced} />,
    },
    {
      key: "confirmed",
      header: "Confirmed",
      headerStyle: { textAlign: "center" },
      cellStyle: { textAlign: "center" },
      interactive: true,
      render: (a) =>
        a.personIsPartner ? (
          <input
            type="checkbox"
            checked={a.confirmed}
            onChange={(e) => {
              e.stopPropagation();
              confirmFeeAllocation.mutate({ allocationId: a.id, confirmed: e.target.checked });
            }}
            disabled={confirmFeeAllocation.isPending}
            title={a.confirmed ? "Uncheck to revert confirmation" : "Check to confirm"}
          />
        ) : (
          <span style={{ color: "var(--pico-muted-color)" }}>n/a</span>
        ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (a) => a.notes ?? <span style={{ color: "var(--pico-muted-color)" }}>—</span>,
    },
  ], [confirmFeeAllocation]);

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
        <DataTable<FeeAllocationSummary>
          columns={columns}
          data={filtered}
          rowHref={(a) => (a.gigId ? `/gigs/${a.gigId}` : a.showcaseId ? `/showcases/${a.showcaseId}` : undefined)}
          hideSearch
        />
      )}

      {/* Total */}
      <RunningTotal pennies={total} />
    </main>
  );
}
