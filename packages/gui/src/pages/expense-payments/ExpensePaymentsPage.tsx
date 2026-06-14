import { useMemo } from "react";
import type { ExpensePaymentSummary } from "@get-down/shared";
import { useAllExpensePayments } from "../../api/hooks/useExpensePayments.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import EmptyState from "../../components/EmptyState.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import YearSelect from "../../components/YearSelect.js";
import CountBadge from "../../components/CountBadge.js";
import RunningTotal from "../../components/RunningTotal.js";
import { formatDate } from "../../utils/date.js";
import { useYearFilter } from "../../hooks/useYearFilter.js";
import {
  calendarYearsFromDates,
  taxYearsFromDates,
  isInCalendarYear,
  isInTaxYear,
} from "../../utils/taxYear.js";

export default function ExpensePaymentsPage() {
  const { data: payments = [], isLoading, error } = useAllExpensePayments();
  const { calendarYear, taxYear, setCalendarYear, setTaxYear } = useYearFilter();

  const allDates = useMemo(() => payments.map((p) => p.date), [payments]);
  const calendarYearOptions = useMemo(() => calendarYearsFromDates(allDates), [allDates]);
  const taxYearOptions = useMemo(() => taxYearsFromDates(allDates), [allDates]);

  const filtered = useMemo<ExpensePaymentSummary[]>(() => {
    if (calendarYear) return payments.filter((p) => isInCalendarYear(p.date, calendarYear));
    if (taxYear) return payments.filter((p) => isInTaxYear(p.date, taxYear));
    return payments;
  }, [payments, calendarYear, taxYear]);

  const total = useMemo(() => filtered.reduce((sum, p) => sum + p.amount, 0), [filtered]);

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error)     return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Expense payments</h1>
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
        <CountBadge count={filtered.length} noun="payment" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No expense payments found." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Expense</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Paid for by</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {p.date ? formatDate(p.date) : <span style={{ color: "var(--pico-muted-color)" }}>No date</span>}
                  </td>
                  <td>{p.expenseDescription}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <MoneyDisplay pennies={p.amount} />
                  </td>
                  <td>{p.paidForBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RunningTotal pennies={total} />
    </main>
  );
}
