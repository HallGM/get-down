import { useMemo, useState } from "react";
import type { ExpensePaymentSummary } from "@get-down/shared";
import { useAllExpensePayments, useCreatePayment, useEligiblePaymentExpenses } from "../../api/hooks/useExpensePayments.js";
import { useAccounts } from "../../api/hooks/useAccounts.js";
import { PaymentFormFields, EMPTY_PAYMENT_FORM, toCreatePaymentRequest, type PaymentFormState } from "../../components/ExpensePaymentFormFields.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import EmptyState from "../../components/EmptyState.js";
import RunningTotal from "../../components/RunningTotal.js";
import YearFilterBar from "../../components/YearFilterBar.js";
import { useYearFilterData } from "../../hooks/useYearFilter.js";
import ExpensePaymentRow from "./ExpensePaymentRow.js";

export default function ExpensePaymentsPage() {
  const { data: payments = [], isLoading, error } = useAllExpensePayments();
  const { data: accounts = [] } = useAccounts();
  const { data: eligibleExpenses = [], isLoading: eligibleExpensesLoading, isError: eligibleExpensesError } = useEligiblePaymentExpenses();
  const createPayment = useCreatePayment();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PaymentFormState>(EMPTY_PAYMENT_FORM);
  const [shares, setShares] = useState<Array<{ expenseId: number; amount: number }>>([]);

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
        {!showForm && <button type="button" onClick={() => setShowForm(true)}>+ Add payment</button>}
      </div>

      {showForm && <article>
        <h2>New payment</h2>
        <PaymentFormFields form={form} setForm={setForm} accounts={accounts} eligibleExpenses={eligibleExpenses} eligibleExpensesLoading={eligibleExpensesLoading} eligibleExpensesError={eligibleExpensesError} shares={shares} setShares={setShares} />
        <button type="button" disabled={!form.accountId || createPayment.isPending} onClick={async () => {
          await createPayment.mutateAsync(toCreatePaymentRequest(form, shares));
          setShowForm(false); setForm(EMPTY_PAYMENT_FORM); setShares([]);
        }}>Record payment</button>
        <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
      </article>}

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
           <table className="expense-payments-table">
             <thead>
               <tr>
                 <th>Date</th>
                  <th>Expenses</th>
                 <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Paid for by</th>
                  <th style={{ textAlign: "right" }}>Assigned</th>
                  <th className="expense-payment-actions-heading">Actions</th>
               </tr>
             </thead>
             <tbody>
                {filtered.map((p) => <ExpensePaymentRow key={p.id} payment={p} />)}
             </tbody>
           </table>
        </div>
      )}

      <RunningTotal pennies={total} />
    </main>
  );
}
