import { useState } from "react";
import { useAttributions, useCreateAttribution, useUpdateAttribution, useDeleteAttribution } from "../../api/hooks/useAttributions.js";
import type { CreateAttributionRequest, UpdateAttributionRequest, Attribution } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";

const COLUMNS: Column<Attribution>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "type", header: "Type", sortable: true },
  { key: "notes", header: "Notes", render: (a) => a.notes ?? "—" },
];

const EMPTY_FORM: CreateAttributionRequest = { name: "", type: "" };

export default function AttributionsList() {
  const { data: attributions, isLoading, error } = useAttributions();
  const createAttribution = useCreateAttribution();
  const updateAttribution = useUpdateAttribution();
  const deleteAttribution = useDeleteAttribution();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateAttributionRequest>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Attribution | null>(null);
  const [editForm, setEditForm] = useState<UpdateAttributionRequest>({});
  const [deleteTarget, setDeleteTarget] = useState<Attribution | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createAttribution.mutateAsync(form);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    await updateAttribution.mutateAsync({ id: editTarget.id, input: editForm });
    setEditTarget(null);
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Attributions</h1>
        <button onClick={() => setShowCreate(true)}>+ New Attribution</button>
      </div>

      <DataTable<Attribution>
        columns={[...COLUMNS, {
          key: "actions", header: "",
          render: (a) => <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={(e) => { e.stopPropagation(); setEditTarget(a); setEditForm({ name: a.name, type: a.type, notes: a.notes }); }}>Edit</button>,
        }]}
        data={attributions ?? []}
        emptyMessage="No attributions yet."
        filterPlaceholder="Search attributions…"
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Attribution">
        <form onSubmit={handleCreate}>
          <FormField label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <FormField label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} required placeholder="e.g. venue, agency, social" />
          <FormField as="textarea" label="Notes" value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createAttribution.isPending} disabled={createAttribution.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Attribution">
        <form onSubmit={handleUpdate}>
          <FormField label="Name" value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
          <FormField label="Type" value={editForm.type ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))} required />
          <FormField as="textarea" label="Notes" value={editForm.notes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="contrast outline" onClick={() => { setDeleteTarget(editTarget); setEditTarget(null); }}>Delete</button>
            <button type="button" className="secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" aria-busy={updateAttribution.isPending} disabled={updateAttribution.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={deleteTarget.name}
          onConfirm={async () => { await deleteAttribution.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteAttribution.isPending}
        />
      )}
    </main>
  );
}
