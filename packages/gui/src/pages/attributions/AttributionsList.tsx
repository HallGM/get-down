import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAttributions, useCreateAttribution, useUpdateAttribution, useDeleteAttribution } from "../../api/hooks/useAttributions.js";
import { useShowcases, useCreateShowcase } from "../../api/hooks/useShowcases.js";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateAttributionRequest, UpdateAttributionRequest, Attribution } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";

type ViewFilter = "all" | "showcases";

const COLUMNS: Column<Attribution>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "type", header: "Type", sortable: true },
  { key: "notes", header: "Notes", render: (a) => a.notes ?? "—" },
];

const EMPTY_FORM: CreateAttributionRequest = { name: "", type: "" };

interface ShowcaseForm {
  name: string;
  date: string;
  location: string;
}

const EMPTY_SHOWCASE_FORM: ShowcaseForm = { name: "", date: "", location: "" };

export default function AttributionsList() {
  const { data: attributions, isLoading, error } = useAttributions();
  const { data: showcases = [] } = useShowcases();
  const createAttribution = useCreateAttribution();
  const createShowcase = useCreateShowcase();
  const updateAttribution = useUpdateAttribution();
  const deleteAttribution = useDeleteAttribution();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Which attributions have a linked showcase
  const showcaseAttributionIds = useMemo(
    () => new Set(showcases.map((s) => s.attributionId)),
    [showcases]
  );

  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");

  const [showCreate, setShowCreate] = useState(false);
  const [isShowcase, setIsShowcase] = useState(false);
  const [form, setForm] = useState<CreateAttributionRequest>(EMPTY_FORM);
  const [showcaseForm, setShowcaseForm] = useState<ShowcaseForm>(EMPTY_SHOWCASE_FORM);

  const [editTarget, setEditTarget] = useState<Attribution | null>(null);
  const [editForm, setEditForm] = useState<UpdateAttributionRequest>({});
  const [deleteTarget, setDeleteTarget] = useState<Attribution | null>(null);

  const filteredAttributions = useMemo(() => {
    const all = attributions ?? [];
    if (viewFilter === "showcases") return all.filter((a) => showcaseAttributionIds.has(a.id));
    return all;
  }, [attributions, viewFilter, showcaseAttributionIds]);

  function resetCreateForm() {
    setForm(EMPTY_FORM);
    setShowcaseForm(EMPTY_SHOWCASE_FORM);
    setIsShowcase(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (isShowcase) {
      await createShowcase.mutateAsync({
        name: showcaseForm.name || undefined,
        date: showcaseForm.date,
        location: showcaseForm.location || undefined,
      });
      // Invalidate attributions so the new auto-created attribution appears
      qc.invalidateQueries({ queryKey: ["attributions"] });
    } else {
      await createAttribution.mutateAsync(form);
    }
    setShowCreate(false);
    resetCreateForm();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    await updateAttribution.mutateAsync({ id: editTarget.id, input: editForm });
    setEditTarget(null);
  }

  const isPending = isShowcase ? createShowcase.isPending : createAttribution.isPending;

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Attributions</h1>
        <button onClick={() => setShowCreate(true)}>+ New Attribution</button>
      </div>

      {/* View filter */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          className={viewFilter === "all" ? "" : "secondary outline"}
          style={{ padding: "0.25em 0.75em" }}
          onClick={() => setViewFilter("all")}
        >
          All
        </button>
        <button
          className={viewFilter === "showcases" ? "" : "secondary outline"}
          style={{ padding: "0.25em 0.75em" }}
          onClick={() => setViewFilter("showcases")}
        >
          Showcases
        </button>
      </div>

      <DataTable<Attribution>
        columns={[...COLUMNS, {
          key: "actions", header: "",
          render: (a) => (
            <button
              className="secondary outline"
              style={{ padding: "0.2em 0.5em" }}
              onClick={(e) => { e.stopPropagation(); setEditTarget(a); setEditForm({ name: a.name, type: a.type, notes: a.notes }); }}
            >
              Edit
            </button>
          ),
        }]}
        data={filteredAttributions}
        emptyMessage={viewFilter === "showcases" ? "No showcases yet." : "No attributions yet."}
        filterPlaceholder="Search attributions…"
        onRowClick={(a) => navigate(`/attributions/${a.id}`)}
      />

      {/* New Attribution / Showcase modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); resetCreateForm(); }}
        title={isShowcase ? "New Showcase" : "New Attribution"}
      >
        <form onSubmit={handleCreate}>
          {/* Is-showcase toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isShowcase}
              onChange={(e) => setIsShowcase(e.target.checked)}
              style={{ margin: 0 }}
            />
            <span>This is a showcase</span>
          </label>

          {isShowcase ? (
            <>
              <FormField
                label="Name"
                value={showcaseForm.name}
                onChange={(e) => setShowcaseForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Summer Showcase 2025"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <FormField
                  label="Date"
                  type="date"
                  value={showcaseForm.date}
                  onChange={(e) => setShowcaseForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
                <FormField
                  label="Location"
                  value={showcaseForm.location}
                  onChange={(e) => setShowcaseForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
            </>
          ) : (
            <>
              <FormField
                label="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <FormField
                label="Type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                required
                placeholder="e.g. venue, agency, social"
              />
              <FormField
                as="textarea"
                label="Notes"
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </>
          )}

          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancel</button>
            <button type="submit" aria-busy={isPending} disabled={isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      {/* Edit Attribution modal */}
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
