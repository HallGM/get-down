import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { GigPaymentSummary } from "@get-down/shared";
import { useAllGigPayments } from "../../api/hooks/usePayments.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import EmptyState from "../../components/EmptyState.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import RunningTotal from "../../components/RunningTotal.js";
import DateCell from "../../components/DateCell.js";
import YearFilterBar from "../../components/YearFilterBar.js";
import { formatDate } from "../../utils/date.js";
import { useYearFilterData } from "../../hooks/useYearFilter.js";

export default function GigPaymentsPage() {
  const { data: summaries = [], isLoading, error } = useAllGigPayments();

  const {
    calendarYear, taxYear, setCalendarYear, setTaxYear,
    calendarYearOptions, taxYearOptions,
    filtered,
  } = useYearFilterData(summaries, (s) => s.date);

  const netTotal = useMemo(
    () => filtered.reduce((sum, s) => (s.type === "payment" ? sum + s.amount : sum - s.amount), 0),
    [filtered],
  );

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
        count={filtered.length}
        noun="transaction"
      />

      {filtered.length === 0 ? (
        <EmptyState message="No gig payments found." />
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RunningTotal pennies={netTotal} label="Net received" />
    </main>
  );
}
