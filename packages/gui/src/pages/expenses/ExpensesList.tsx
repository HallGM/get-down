import { useState, useMemo } from "react";
import { useYearFilterData } from "../../hooks/useYearFilter.js";
import { useExpenses, useDeleteExpense } from "../../api/hooks/useExpenses.js";
import { useFeeAllocations } from "../../api/hooks/useFeeAllocations.js";
import { useAllAttributionFees } from "../../api/hooks/useAttributionFees.js";
import type { Expense } from "@get-down/shared";
import DataTable, { type Column, multiWordFilter } from "../../components/DataTable.js";
import PaymentStatusBadge from "../../components/PaymentStatusBadge.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import ExpenseModal from "../../components/ExpenseModal.js";
import ExpenseCreateModal from "../../components/ExpenseCreateModal.js";
import YearFilterBar from "../../components/YearFilterBar.js";
import { formatDate } from "../../utils/date.js";
import RunningTotal from "../../components/RunningTotal.js";

const COLUMNS: Column<Expense>[] = [
  { key: "date", header: "Date", sortable: true, render: (e) => formatDate(e.date) },
  { key: "description", header: "Description", sortable: true },
  { key: "category", header: "Category", render: (e) => e.category ?? "—" },
  { key: "amount", header: "Amount", render: (e) => <MoneyDisplay pennies={e.amount} /> },
  {
    key: "paymentStatus",
    header: "Status",
    render: (e) => <PaymentStatusBadge status={e.paymentStatus} />,
  },
  { key: "recipientName", header: "Recipient", render: (e) => e.recipientName ?? "—" },
  {
    key: "documentUrl",
    header: "Document",
    render: (e) =>
      e.documentUrl ? (
        <a href={e.documentUrl} target="_blank" rel="noopener noreferrer">
          View
        </a>
      ) : null,
  },
];

/**
 * Expenses-specific filter: searches date, description, category, and recipient name.
 */
function filterExpense(expense: Expense, query: string): boolean {
  return multiWordFilter(query, [
    expense.date,
    expense.description,
    expense.category ?? "",
    expense.recipientName ?? "",
  ]);
}

export default function ExpensesList() {
  const { data: expenses, isLoading, error } = useExpenses();
  const { data: allAllocations = [] } = useFeeAllocations();
  const { data: allAttributionFees = [] } = useAllAttributionFees();
  const deleteExpense = useDeleteExpense();

  const [showCreate, setShowCreate] = useState(false);
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // Filter state — only one active at a time; null means "All"
  const {
    calendarYear, taxYear, setCalendarYear, setTaxYear,
    calendarYearOptions, taxYearOptions,
    filtered: filteredExpenses,
  } = useYearFilterData(expenses ?? [], (e) => e.date);

  // Always derive the edit target from live query data so linked allocation IDs stay fresh
  const editTarget = editTargetId != null ? (expenses ?? []).find((e) => e.id === editTargetId) ?? null : null;

  // Running total for visible expenses
  const total = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Expenses</h1>
        <button onClick={() => setShowCreate(true)}>+ New Expense</button>
      </div>

      <YearFilterBar
        calendarYear={calendarYear}
        taxYear={taxYear}
        calendarYearOptions={calendarYearOptions}
        taxYearOptions={taxYearOptions}
        setCalendarYear={setCalendarYear}
        setTaxYear={setTaxYear}
        count={filteredExpenses.length}
        noun="expense"
      />

      <DataTable<Expense>
        columns={[...COLUMNS, {
          key: "actions", header: "",
          render: (exp) => (
            <button
              className="secondary outline"
              style={{ padding: "0.2em 0.5em" }}
              onClick={(e) => { e.stopPropagation(); setEditTargetId(exp.id); }}
            >
              Edit
            </button>
          ),
        }]}
        data={filteredExpenses}
        emptyMessage="No expenses found."
        filterPlaceholder="Search expenses…"
        filterFn={filterExpense}
      />

      {/* Total */}
      <RunningTotal pennies={total} />

      {/* New Expense modal */}
      <ExpenseCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => setShowCreate(false)}
      />

      {/* Edit Expense modal (shared component) */}
      <ExpenseModal
        expense={editTarget}
        onClose={() => setEditTargetId(null)}
        allAllocations={allAllocations}
        allAttributionFees={allAttributionFees}
        onDelete={() => {
          if (editTarget) {
            setDeleteTarget(editTarget);
            setEditTargetId(null);
          }
        }}
      />

      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={deleteTarget.description}
          onConfirm={async () => { await deleteExpense.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteExpense.isPending}
        />
      )}
    </main>
  );
}
