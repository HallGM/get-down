import { useState, useMemo } from "react";
import { useExpenses, useDeleteExpense } from "../../api/hooks/useExpenses.js";
import { useFeeAllocations } from "../../api/hooks/useFeeAllocations.js";
import { useAccounts } from "../../api/hooks/useAccounts.js";
import type { Expense } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import ExpenseModal from "../../components/ExpenseModal.js";
import ExpenseCreateModal from "../../components/ExpenseCreateModal.js";
import { formatDate } from "../../utils/date.js";
import { formatPennies } from "../../utils/money.js";
import {
  calendarYearsFromDates,
  taxYearsFromDates,
  isInTaxYear,
} from "../../utils/taxYear.js";
import YearSelect from "../../components/YearSelect.js";
import CountBadge from "../../components/CountBadge.js";

const COLUMNS: Column<Expense>[] = [
  { key: "date", header: "Date", sortable: true, render: (e) => formatDate(e.date) },
  { key: "paidDate", header: "Paid date", render: (e) => formatDate(e.paidDate) },
  { key: "description", header: "Description", sortable: true },
  { key: "category", header: "Category", render: (e) => e.category ?? "—" },
  { key: "amount", header: "Amount", render: (e) => <MoneyDisplay pennies={e.amount} /> },
  { key: "recipientName", header: "Recipient", render: (e) => e.recipientName ?? "—" },
  { key: "paymentMethod", header: "Method", render: (e) => e.paymentMethod ?? "—" },
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

export default function ExpensesList() {
  const { data: expenses, isLoading, error } = useExpenses();
  const { data: allAllocations = [] } = useFeeAllocations();
  const { data: accounts = [] } = useAccounts();
  const deleteExpense = useDeleteExpense();

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.personName])),
    [accounts]
  );

  const [showCreate, setShowCreate] = useState(false);
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // Filter state — only one active at a time; null means "All"
  const [calendarYear, setCalendarYear] = useState<string | null>(null);
  const [taxYear, setTaxYear] = useState<string | null>(null);

  // Always derive the edit target from live query data so linked allocation IDs stay fresh
  const editTarget = editTargetId != null ? (expenses ?? []).find((e) => e.id === editTargetId) ?? null : null;

  // Derive available filter options from actual data
  const allDates = useMemo(() => (expenses ?? []).map((e) => e.date), [expenses]);
  const calendarYearOptions = useMemo(() => calendarYearsFromDates(allDates), [allDates]);
  const taxYearOptions = useMemo(() => taxYearsFromDates(allDates), [allDates]);

  // Apply the active filter
  const filteredExpenses = useMemo(() => {
    const all = expenses ?? [];
    if (calendarYear) {
      return all.filter((e) => e.date?.slice(0, 4) === calendarYear);
    }
    if (taxYear) {
      return all.filter((e) => isInTaxYear(e.date, taxYear));
    }
    return all;
  }, [expenses, calendarYear, taxYear]);

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

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <YearSelect
          label="Year:"
          value={calendarYear ?? ""}
          options={calendarYearOptions}
          onChange={(val) => { setCalendarYear(val); setTaxYear(null); }}
        />
        <YearSelect
          label="Tax year:"
          value={taxYear ?? ""}
          options={taxYearOptions}
          onChange={(val) => { setTaxYear(val); setCalendarYear(null); }}
        />
        <CountBadge count={filteredExpenses.length} noun="expense" />
      </div>

      <DataTable<Expense>
        columns={[...COLUMNS, {
          key: "paidByAccountId",
          header: "Paid by",
          render: (e) => e.paidByAccountId != null ? (accountMap.get(e.paidByAccountId) ?? "—") : "—",
        }, {
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
      />

      {/* Total */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <span style={{ fontWeight: 600 }}>
          Total: {formatPennies(total)}
        </span>
      </div>

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
