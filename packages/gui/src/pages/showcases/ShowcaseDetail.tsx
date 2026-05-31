import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useShowcase, useUpdateShowcase, useDeleteShowcase } from "../../api/hooks/useShowcases.js";
import type { UpdateShowcaseRequest } from "@get-down/shared";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import ShowcaseRolesTab from "../attributions/ShowcaseRolesTab.js";
import ShowcaseExpensesTab from "./ShowcaseExpensesTab.js";

export default function ShowcaseDetail() {
  const { id } = useParams<{ id: string }>();
  const showcaseId = Number(id);
  const navigate = useNavigate();

  const { data: showcase, isLoading, error } = useShowcase(showcaseId);
  const updateShowcase = useUpdateShowcase();
  const deleteShowcase = useDeleteShowcase();

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<UpdateShowcaseRequest>({});
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<"expenses" | "roles">("expenses");

  function openEdit() {
    if (!showcase) return;
    setEditForm({ nickname: showcase.nickname, fullName: showcase.fullName, date: showcase.date, location: showcase.location });
    setShowEdit(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    await updateShowcase.mutateAsync({ id: showcaseId, input: editForm });
    setShowEdit(false);
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;
  if (!showcase) return <main className="container"><ErrorBanner error={new Error("Showcase not found")} /></main>;

  const displayName = showcase.nickname ?? showcase.fullName ?? `Showcase #${showcaseId}`;

  return (
    <main className="container">
      <div style={{ marginBottom: "0.5rem" }}>
        <Link to="/showcases" style={{ color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>
          ← Showcases
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ marginBottom: "0.25rem" }}>{displayName}</h1>
          <div style={{ display: "flex", gap: "1rem", color: "var(--pico-muted-color)", fontSize: "0.9em", flexWrap: "wrap" }}>
            {showcase.fullName && showcase.fullName !== displayName && <span>{showcase.fullName}</span>}
            {showcase.date && <span>{formatDate(showcase.date)}</span>}
            {showcase.location && <span>{showcase.location}</span>}
          </div>
        </div>
        <button className="secondary outline" style={{ padding: "0.3em 0.7em" }} onClick={openEdit}>Edit</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--pico-muted-border-color)", marginBottom: "1.5rem" }}>
        <button
          className={activeTab === "expenses" ? "outline" : "secondary outline"}
          style={{ borderBottom: activeTab === "expenses" ? "2px solid var(--pico-primary)" : "none", borderRadius: 0, padding: "0.4em 1em" }}
          onClick={() => setActiveTab("expenses")}
        >
          Expenses
        </button>
        <button
          className={activeTab === "roles" ? "outline" : "secondary outline"}
          style={{ borderBottom: activeTab === "roles" ? "2px solid var(--pico-primary)" : "none", borderRadius: 0, padding: "0.4em 1em" }}
          onClick={() => setActiveTab("roles")}
        >
          Roles &amp; Billing
        </button>
      </div>

      {activeTab === "expenses" && (
        <ShowcaseExpensesTab showcase={showcase} />
      )}
      {activeTab === "roles" && (
        <ShowcaseRolesTab showcaseId={showcaseId} />
      )}

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Showcase">
        <form onSubmit={handleUpdate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField
              label="Nickname"
              value={editForm.nickname ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, nickname: e.target.value }))}
            />
            <FormField
              label="Full Name"
              value={editForm.fullName ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
            />
            <FormField
              label="Date"
              type="date"
              value={toInputDate(editForm.date)}
              onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
            <FormField
              label="Location"
              value={editForm.location ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="contrast outline" onClick={() => { setShowEdit(false); setShowDelete(true); }}>Delete</button>
            <button type="button" className="secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button type="submit" aria-busy={updateShowcase.isPending} disabled={updateShowcase.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {showDelete && (
        <ConfirmDelete
          open={showDelete}
          itemName={displayName}
          onConfirm={async () => { await deleteShowcase.mutateAsync(showcaseId); navigate("/showcases"); }}
          onCancel={() => setShowDelete(false)}
          loading={deleteShowcase.isPending}
        />
      )}
    </main>
  );
}
