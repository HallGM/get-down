import { useMemo } from "react";
import type { ExpensePaymentSummary } from "@get-down/shared";
import { useAllExpensePayments } from "../../api/hooks/useExpensePayments.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import EmptyState from "../../components/EmptyState.js";
import RunningTotal from "../../components/RunningTotal.js";
import YearFilterBar from "../../components/YearFilterBar.js";
import { useYearFilterData } from "../../hooks/useYearFilter.js";
import ExpensePaymentRow from "./ExpensePaymentRow.js";

export default function ExpensePaymentsPage() {
  const { data: payments = [], isLoading, error } = useAllExpensePayments();

  const {
    calendarYear, taxYear, setCalendarYear, setTaxYear,
    calendarYearOptions, taxYearOptions,
    filtered,
  } = useYearFilterData(payments, (p) => p.date);

  const total = useMemo(() => filtered.reduce((sum, p) => sum + p.amount, 0), [filtered]);

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error)     return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Expense payments</h1>
      </div>

      <YearFilterBar
        calendarYear={calendarYear}
        taxYear={taxYear}
        calendarYearOptions={calendarYearOptions}
        taxYearOptions={taxYearOptions}
        setCalendarYear={setCalendarYear}
        setTaxYear={setTaxYear}
        count={filtered.length}
        noun="payment"
      />

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
                 <th style={{ textAlign: "right" }}>Actions</th>
               </tr>
             </thead>
             <tbody>
               {filtered.map((p) => (
                 <ExpensePaymentRow key={p.id} payment={p} />
               ))}
             </tbody>
           </table>
        </div>
      )}

      <RunningTotal pennies={total} />
    </main>
  );
}
