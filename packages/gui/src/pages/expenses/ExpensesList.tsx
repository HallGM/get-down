import { useState } from "react";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "../../api/hooks/useExpenses.js";
import type { CreateExpenseRequest, Expense } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import { formatDate, toInputDate } from "../../utils/date.js";

const COLUMNS: Column<Expense>[] = [
  { key: "date", header: "Date", sortable: true, render: (e) => formatDate(e.date) },
  { key: "description", header: "Description", sortable: true },
  { key: "category", header: "Category", render: (e) => e.category ?? "—" },
  { key: "amount", header: "Amount", render: (e) => <MoneyDisplay pennies={e.amount} /> },
  { key: "recipientName", header: "Recipient", render: (e) => e.recipientName ?? "—" },
  { key: "paymentMethod", header: "Method", render: (e) => e.paymentMethod ?? "—" },
];

const EMPTY_FORM: CreateExpenseRequest = { description: "", amount: 0 };

export default function ExpensesList() {
  const { data: expenses, isLoading, error } = useExpenses();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateExpenseRequest>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateExpenseRequest>>({});
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createExpense.mutateAsync(form);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    await updateExpense.mutateAsync({ id: editTarget.id, input: editForm });
    setEditTarget(null);
  }

  function openEdit(exp: Expense) {
    setEditTarget(exp);
    setEditForm({ description: exp.description, amount: exp.amount, date: exp.date, category: exp.category, recipientName: exp.recipientName, paymentMethod: exp.paymentMethod });
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Expenses</h1>
        <button onClick={() => setShowCreate(true)}>+ New Expense</button>
      </div>

      <DataTable<Expense>
        columns={[...COLUMNS, {
          key: "actions", header: "",
          render: (exp) => <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={(e) => { e.stopPropagation(); openEdit(exp); }}>Edit</button>,
        }]}
        data={expenses ?? []}
        emptyMessage="No expenses yet."
        filterPlaceholder="Search expenses…"
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Expense">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
            <FormField label="Amount (pennies)" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} required min={0} />
            <FormField label="Date" type="date" value={form.date ?? ""} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <FormField label="Category" value={form.category ?? ""} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            <FormField label="Recipient" value={form.recipientName ?? ""} onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))} />
            <FormField label="Payment Method" value={form.paymentMethod ?? ""} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} />
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createExpense.isPending} disabled={createExpense.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Expense">
        <form onSubmit={handleUpdate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Description" value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} required />
            <FormField label="Amount (pennies)" type="number" value={editForm.amount ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, amount: Number(e.target.value) }))} required min={0} />
            <FormField label="Date" type="date" value={toInputDate(editForm.date)} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
            <FormField label="Category" value={editForm.category ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} />
            <FormField label="Recipient" value={editForm.recipientName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, recipientName: e.target.value }))} />
            <FormField label="Payment Method" value={editForm.paymentMethod ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, paymentMethod: e.target.value }))} />
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="contrast outline" onClick={() => { setDeleteTarget(editTarget); setEditTarget(null); }}>Delete</button>
            <button type="button" className="secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" aria-busy={updateExpense.isPending} disabled={updateExpense.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

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
