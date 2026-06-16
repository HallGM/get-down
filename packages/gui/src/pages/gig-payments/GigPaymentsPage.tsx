import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { GigPaymentSummary } from "@get-down/shared";
import { useSearch } from "../../hooks/useSearch.js";
import { useAllGigPayments, useUpdatePayment } from "../../api/hooks/usePayments.js";
import { useReceivedByAccounts } from "../../api/hooks/useAccounts.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import EmptyState from "../../components/EmptyState.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import RunningTotal from "../../components/RunningTotal.js";
import DateCell from "../../components/DateCell.js";
import YearFilterBar from "../../components/YearFilterBar.js";
import SearchInput from "../../components/SearchInput.js";
import EditReceivedByModal from "../../components/EditReceivedByModal.js";
import { formatDate } from "../../utils/date.js";
import { useYearFilterData } from "../../hooks/useYearFilter.js";

// ---------------------------------------------------------------------------
// Filter predicate (module-scope keeps the reference stable for useSearch)
// ---------------------------------------------------------------------------
function filterGigPayment(s: GigPaymentSummary, q: string): boolean {
  const client = `${s.clientFirstName} ${s.clientLastName}`.toLowerCase();
  return (
    client.includes(q) ||
    (s.method ?? "").toLowerCase().includes(q) ||
    (s.description ?? "").toLowerCase().includes(q) ||
    (s.receivedBy ?? "not set").toLowerCase().includes(q)
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function GigPaymentsPage() {
  const { data: summaries = [], isLoading, error } = useAllGigPayments();
  const { data: receivedByAccounts = [] } = useReceivedByAccounts();
  const updatePayment = useUpdatePayment();

  const [editTarget, setEditTarget] = useState<{ id: number; receivedByAccountId: number | null } | null>(null);

  const {
    calendarYear, taxYear, setCalendarYear, setTaxYear,
    calendarYearOptions, taxYearOptions,
    filtered,
  } = useYearFilterData(summaries, (s) => s.date);

  const { search, setSearch, displayed: displayedRows } = useSearch(filtered, filterGigPayment);

  const netTotal = useMemo(
    () => displayedRows.reduce((sum, s) => (s.type === "payment" ? sum + s.amount : sum - s.amount), 0),
    [displayedRows],
  );

  function openEdit(s: GigPaymentSummary) {
    setEditTarget({ id: s.id, receivedByAccountId: s.receivedByAccountId ?? null });
  }

  async function handleEditReceivedBy(receivedByAccountId: number | null) {
    if (!editTarget) return;
    await updatePayment.mutateAsync({ id: editTarget.id, input: { receivedByAccountId } });
    setEditTarget(null);
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error)     return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Gig payments</h1>
      </div>

      <YearFilterBar
        calendarYear={calendarYear}
        taxYear={taxYear}
        calendarYearOptions={calendarYearOptions}
        taxYearOptions={taxYearOptions}
        setCalendarYear={setCalendarYear}
        setTaxYear={setTaxYear}
        count={displayedRows.length}
        noun="transaction"
      />

      <div style={{ marginBottom: "1rem" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by client, method, description or recipient..."
          ariaLabel="Search gig payments"
        />
      </div>

      {displayedRows.length === 0 ? (
        <EmptyState message={search ? "No payments match your search." : "No gig payments found."} />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Client</th>
                <th>Gig date</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Method</th>
                <th>Description</th>
                <th>Received by</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((s) => (
                <tr key={`${s.type}-${s.id}`}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <DateCell date={s.date} />
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{s.type}</td>
                  <td>
                    <Link to={`/gigs/${s.gigId}`}>
                      {s.clientFirstName} {s.clientLastName}
                    </Link>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(s.gigDate)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <MoneyDisplay pennies={s.amount} />
                  </td>
                  <td>{s.method ?? <span style={{ color: "var(--pico-muted-color)" }}>—</span>}</td>
                  <td>{s.description ?? <span style={{ color: "var(--pico-muted-color)" }}>—</span>}</td>
                   <td style={{ color: s.receivedBy ? "inherit" : "var(--pico-muted-color)" }}>
                    {s.receivedBy ?? "Not set"}
                  </td>
                  <td>
                    {s.type === "payment" && (
                      <button
                        className="secondary outline"
                        style={{ padding: "0.5em 0.75em", minWidth: "2.75rem", minHeight: "2.75rem" }}
                        aria-label={`Edit received by for payment from ${s.clientFirstName} ${s.clientLastName}`}
                        onClick={() => openEdit(s)}
                      >✏️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RunningTotal pennies={netTotal} label="Net received" />

      <EditReceivedByModal
        open={!!editTarget}
        receivedByAccountId={editTarget?.receivedByAccountId ?? null}
        accounts={receivedByAccounts}
        onSave={handleEditReceivedBy}
        onClose={() => setEditTarget(null)}
        isPending={updatePayment.isPending}
      />
    </main>
  );
}
