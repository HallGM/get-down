import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShowcases, useCreateShowcase, useUpdateShowcase, useDeleteShowcase } from "../../api/hooks/useShowcases.js";
import type { CreateShowcaseRequest, UpdateShowcaseRequest, Showcase } from "@get-down/shared";
import DataTable, { type Column, multiWordFilter } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import { formatDate, toInputDate } from "../../utils/date.js";

const COLUMNS: Column<Showcase>[] = [
  { key: "date", header: "Date", sortable: true, render: (s) => formatDate(s.date) },
  { key: "nickname", header: "Nickname", sortable: true, render: (s) => s.nickname ?? "—" },
  { key: "fullName", header: "Full Name", sortable: true, render: (s) => s.fullName ?? "—" },
  { key: "calculatedCost", header: "Cost", render: (s) => <MoneyDisplay pennies={s.calculatedCost ?? 0} /> },
  { key: "linkedGigCount", header: "Gigs", render: (s) => String(s.linkedGigCount ?? 0) },
  {
    key: "netProfit",
    header: "Profit",
    render: (s) => (
      <div>
        <MoneyDisplay pennies={s.netProfit ?? 0} />
        {(s.predictedGigCount ?? 0) > 0 && (
          <div style={{ fontSize: "0.75em", color: "var(--pico-muted-color)" }}>includes estimates</div>
        )}
      </div>
    ),
  },
];

const EMPTY_FORM: CreateShowcaseRequest = { date: "" };

/**
 * Showcases-specific filter: searches nickname, full name, date, and location.
 */
function filterShowcase(showcase: Showcase, query: string): boolean {
  return multiWordFilter(query, [
    showcase.nickname ?? "",
    showcase.fullName ?? "",
    showcase.date,
    showcase.location ?? "",
  ]);
}

export default function ShowcasesList() {
  const { data: showcases, isLoading, error } = useShowcases();
  const createShowcase = useCreateShowcase();
  const updateShowcase = useUpdateShowcase();
  const deleteShowcase = useDeleteShowcase();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateShowcaseRequest>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Showcase | null>(null);
  const [editForm, setEditForm] = useState<UpdateShowcaseRequest>({});
  const [deleteTarget, setDeleteTarget] = useState<Showcase | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createShowcase.mutateAsync(form);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    await updateShowcase.mutateAsync({ id: editTarget.id, input: editForm });
    setEditTarget(null);
  }

  function openEdit(s: Showcase) {
    setEditTarget(s);
    setEditForm({ nickname: s.nickname, fullName: s.fullName, date: s.date, location: s.location });
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Showcases</h1>
        <button onClick={() => setShowCreate(true)}>+ New Showcase</button>
      </div>

      <DataTable<Showcase>
        columns={[...COLUMNS, {
          key: "actions", header: "",
          render: (s) => <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={(e) => { e.stopPropagation(); openEdit(s); }}>Edit</button>,
        }]}
        data={showcases ?? []}
        emptyMessage="No showcases yet."
        filterPlaceholder="Search showcases…"
        filterFn={filterShowcase}
        onRowClick={(s) => navigate(`/showcases/${s.id}`)}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Showcase">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Nickname" value={form.nickname ?? ""} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} />
            <FormField label="Full Name" value={form.fullName ?? ""} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            <FormField label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
            <FormField label="Location" value={form.location ?? ""} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createShowcase.isPending} disabled={createShowcase.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Showcase">
        <form onSubmit={handleUpdate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Nickname" value={editForm.nickname ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, nickname: e.target.value }))} />
            <FormField label="Full Name" value={editForm.fullName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} />
            <FormField label="Date" type="date" value={toInputDate(editForm.date)} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} required />
            <FormField label="Location" value={editForm.location ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="contrast outline" onClick={() => { setDeleteTarget(editTarget); setEditTarget(null); }}>Delete</button>
            <button type="button" className="secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" aria-busy={updateShowcase.isPending} disabled={updateShowcase.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={deleteTarget.fullName ?? deleteTarget.nickname ?? String(deleteTarget.id)}
          onConfirm={async () => { await deleteShowcase.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteShowcase.isPending}
        />
      )}
    </main>
  );
}
