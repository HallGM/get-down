import { useState } from "react";
import { useRehearsals, useCreateRehearsal, useUpdateRehearsal, useDeleteRehearsal } from "../../api/hooks/useRehearsals.js";
import type { CreateRehearsalRequest, Rehearsal } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import { penniesToPounds, poundsToPennies } from "../../utils/money.js";
import { formatDate, toInputDate } from "../../utils/date.js";

const COLUMNS: Column<Rehearsal>[] = [
  { key: "date", header: "Date", sortable: true, render: (r) => formatDate(r.date) },
  { key: "name", header: "Name", sortable: true },
  { key: "location", header: "Location", render: (r) => r.location ?? "—" },
  { key: "cost", header: "Cost", render: (r) => <MoneyDisplay pennies={r.cost} /> },
  { key: "notes", header: "Notes", render: (r) => r.notes ?? "—" },
];

const EMPTY_FORM: CreateRehearsalRequest = { name: "", date: "" };

export default function RehearsalsList() {
  const { data: rehearsals, isLoading, error } = useRehearsals();
  const createRehearsal = useCreateRehearsal();
  const updateRehearsal = useUpdateRehearsal();
  const deleteRehearsal = useDeleteRehearsal();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateRehearsalRequest>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Rehearsal | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateRehearsalRequest>>({});
  const [deleteTarget, setDeleteTarget] = useState<Rehearsal | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const costPennies = form.cost != null ? poundsToPennies(form.cost) : undefined;
    await createRehearsal.mutateAsync({ ...form, cost: costPennies });
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const costPennies = editForm.cost != null ? poundsToPennies(editForm.cost) : undefined;
    await updateRehearsal.mutateAsync({ id: editTarget.id, input: { ...editForm, cost: costPennies } });
    setEditTarget(null);
  }

  function openEdit(r: Rehearsal) {
    setEditTarget(r);
    setEditForm({ name: r.name, date: r.date, location: r.location, cost: r.cost != null ? penniesToPounds(r.cost) : undefined, notes: r.notes });
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Rehearsals</h1>
        <button onClick={() => setShowCreate(true)}>+ New Rehearsal</button>
      </div>

      <DataTable<Rehearsal>
        columns={[...COLUMNS, {
          key: "actions", header: "",
          render: (r) => <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Edit</button>,
        }]}
        data={rehearsals ?? []}
        emptyMessage="No rehearsals yet."
        filterPlaceholder="Search rehearsals…"
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Rehearsal">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            <FormField label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
            <FormField label="Location" value={form.location ?? ""} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            <FormField label="Cost (£)" type="number" step={0.01} value={form.cost ?? ""} onChange={(e) => setForm((f) => ({ ...f, cost: Number(e.target.value) || undefined }))} min={0} />
          </div>
          <FormField as="textarea" label="Notes" value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createRehearsal.isPending} disabled={createRehearsal.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Rehearsal">
        <form onSubmit={handleUpdate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Name" value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
            <FormField label="Date" type="date" value={toInputDate(editForm.date)} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} required />
            <FormField label="Location" value={editForm.location ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
            <FormField label="Cost (£)" type="number" step={0.01} value={editForm.cost ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, cost: Number(e.target.value) || undefined }))} min={0} />
          </div>
          <FormField as="textarea" label="Notes" value={editForm.notes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="contrast outline" onClick={() => { setDeleteTarget(editTarget); setEditTarget(null); }}>Delete</button>
            <button type="button" className="secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" aria-busy={updateRehearsal.isPending} disabled={updateRehearsal.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={deleteTarget.name}
          onConfirm={async () => { await deleteRehearsal.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteRehearsal.isPending}
        />
      )}
    </main>
  );
}
