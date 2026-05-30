import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAttribution, useUpdateAttribution, useDeleteAttribution } from "../../api/hooks/useAttributions.js";
import { useAttributionFees } from "../../api/hooks/useAttributionFees.js";
import type { Attribution, UpdateAttributionRequest } from "@get-down/shared";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import { FeesSection } from "../../components/FeesSection.js";

// ─── Attribution header ───────────────────────────────────────────────────────

function AttributionHeader({
  attribution,
  onEdit,
}: {
  attribution: Attribution;
  onEdit: () => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>{attribution.name}</h1>
        <div style={{ display: "flex", gap: "1rem", color: "var(--pico-muted-color)", fontSize: "0.9em", flexWrap: "wrap" }}>
          <span>Type: <strong style={{ color: "inherit" }}>{attribution.type}</strong></span>
          {attribution.notes && <span>{attribution.notes}</span>}
        </div>
      </div>
      <button className="secondary outline" style={{ padding: "0.3em 0.7em" }} onClick={onEdit}>Edit</button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AttributionDetail() {
  const { id } = useParams<{ id: string }>();
  const attributionId = Number(id);
  const navigate = useNavigate();

  const { data: attribution, isLoading, error } = useAttribution(attributionId);
  const { data: fees = [] } = useAttributionFees(attributionId);
  const updateAttribution = useUpdateAttribution();
  const deleteAttribution = useDeleteAttribution();

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<UpdateAttributionRequest>({});
  const [showDelete, setShowDelete] = useState(false);

  function openEdit(a: Attribution) {
    setEditForm({ name: a.name, type: a.type, notes: a.notes });
    setShowEdit(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    await updateAttribution.mutateAsync({ id: attributionId, input: editForm });
    setShowEdit(false);
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;
  if (!attribution) return <main className="container"><ErrorBanner error={new Error("Attribution not found")} /></main>;

  return (
    <main className="container">
      <div style={{ marginBottom: "0.5rem" }}>
        <Link to="/attributions" style={{ color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>
          ← Attributions
        </Link>
      </div>

      <AttributionHeader attribution={attribution} onEdit={() => openEdit(attribution)} />

      {attribution.showcase && (
        <p style={{ color: "var(--pico-muted-color)", fontSize: "0.9em", marginBottom: "1.5rem" }}>
          This attribution is linked to a showcase.{" "}
          <Link to={`/showcases/${attribution.showcase.id}`}>View showcase →</Link>
        </p>
      )}

      <FeesSection fees={fees} attributionId={attributionId} />

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Attribution">
        <form onSubmit={handleUpdate}>
          <FormField
            label="Name"
            value={editForm.name ?? ""}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <FormField
            label="Type"
            value={editForm.type ?? ""}
            onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
            required
          />
          <FormField
            as="textarea"
            label="Notes"
            value={editForm.notes ?? ""}
            onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="contrast outline" onClick={() => { setShowEdit(false); setShowDelete(true); }}>Delete</button>
            <button type="button" className="secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button type="submit" aria-busy={updateAttribution.isPending} disabled={updateAttribution.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      <ConfirmDelete
        open={showDelete}
        itemName={attribution.name}
        onConfirm={async () => { await deleteAttribution.mutateAsync(attributionId); navigate("/attributions"); }}
        onCancel={() => setShowDelete(false)}
        loading={deleteAttribution.isPending}
      />
    </main>
  );
}
