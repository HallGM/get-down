import { useState } from "react";
import type { AttributionFee, CreateAttributionFeeRequest } from "@get-down/shared";
import {
  useCreateAttributionFee,
  useUpdateAttributionFee,
  useDeleteAttributionFee,
  useLinkExpenseToAttributionFee,
  useUnlinkExpenseFromAttributionFee,
} from "../api/hooks/useAttributionFees.js";
import { useExpenses } from "../api/hooks/useExpenses.js";
import Modal from "./Modal.js";
import ConfirmDelete from "./ConfirmDelete.js";
import FormField from "./FormField.js";
import MoneyField from "./MoneyField.js";
import MoneyDisplay from "./MoneyDisplay.js";
import { formatDate, toInputDate } from "../utils/date.js";

// ─── FeesSection ──────────────────────────────────────────────────────────────

interface FeesSectionProps {
  fees: AttributionFee[];
  attributionId: number;
}

export function FeesSection({ fees, attributionId }: FeesSectionProps) {
  const createFee = useCreateAttributionFee(attributionId);
  const updateFee = useUpdateAttributionFee(attributionId);
  const deleteFee = useDeleteAttributionFee(attributionId);
  const linkExpense = useLinkExpenseToAttributionFee(attributionId);
  const unlinkExpense = useUnlinkExpenseFromAttributionFee(attributionId);
  const { data: allExpenses = [] } = useExpenses();

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAttributionFeeRequest>({});
  const [editingFeeId, setEditingFeeId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CreateAttributionFeeRequest>({});
  const [deleteFeeTarget, setDeleteFeeTarget] = useState<AttributionFee | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createFee.mutateAsync(createForm);
    setShowCreate(false);
    setCreateForm({});
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFeeId) return;
    await updateFee.mutateAsync({ feeId: editingFeeId, input: editForm });
    setEditingFeeId(null);
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Attribution Fees</h2>
        <button className="secondary outline" style={{ padding: "0.25em 0.6em" }} onClick={() => setShowCreate(true)}>+ Add Fee</button>
      </div>

      {fees.length === 0 ? (
        <p style={{ color: "var(--pico-muted-color)", fontSize: "0.9em" }}>No fees yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {fees.map((fee) => (
            <FeeCard
              key={fee.id}
              fee={fee}
              allExpenses={allExpenses}
              onEdit={() => { setEditingFeeId(fee.id); setEditForm({ description: fee.description, date: fee.date, amount: fee.amount }); }}
              onDelete={() => setDeleteFeeTarget(fee)}
              onLinkExpense={(expenseId) => linkExpense.mutate({ feeId: fee.id, expenseId })}
              onUnlinkExpense={(expenseId) => unlinkExpense.mutate({ feeId: fee.id, expenseId })}
            />
          ))}
        </div>
      )}

      {/* Create fee modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Fee">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Description" value={createForm.description ?? ""} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
            <FormField label="Date" type="date" value={createForm.date ?? ""} onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))} />
            <MoneyField label="Amount" value={createForm.amount} onChange={(p) => setCreateForm((f) => ({ ...f, amount: p ?? undefined }))} min={0} />
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createFee.isPending} disabled={createFee.isPending}>Add</button>
          </footer>
        </form>
      </Modal>

      {/* Edit fee modal */}
      <Modal open={!!editingFeeId} onClose={() => setEditingFeeId(null)} title="Edit Fee">
        <form onSubmit={handleUpdate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Description" value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            <FormField label="Date" type="date" value={toInputDate(editForm.date)} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
            <MoneyField label="Amount" value={editForm.amount} onChange={(p) => setEditForm((f) => ({ ...f, amount: p ?? undefined }))} min={0} />
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="contrast outline"
              onClick={() => { const fee = fees.find((f) => f.id === editingFeeId); if (fee) setDeleteFeeTarget(fee); setEditingFeeId(null); }}
            >
              Delete
            </button>
            <button type="button" className="secondary" onClick={() => setEditingFeeId(null)}>Cancel</button>
            <button type="submit" aria-busy={updateFee.isPending} disabled={updateFee.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {deleteFeeTarget && (
        <ConfirmDelete
          open={!!deleteFeeTarget}
          itemName={deleteFeeTarget.description ?? `Fee #${deleteFeeTarget.id}`}
          onConfirm={async () => { await deleteFee.mutateAsync(deleteFeeTarget.id); setDeleteFeeTarget(null); }}
          onCancel={() => setDeleteFeeTarget(null)}
          loading={deleteFee.isPending}
        />
      )}
    </section>
  );
}

// ─── FeeCard ──────────────────────────────────────────────────────────────────

interface FeeCardProps {
  fee: AttributionFee;
  allExpenses: { id: number; description: string; amount: number }[];
  onEdit: () => void;
  onDelete: () => void;
  onLinkExpense: (expenseId: number) => void;
  onUnlinkExpense: (expenseId: number) => void;
}

export function FeeCard({ fee, allExpenses, onEdit, onDelete, onLinkExpense, onUnlinkExpense }: FeeCardProps) {
  const linkedExpenses = allExpenses.filter((e) => fee.expenseIds.includes(e.id));
  const unlinkableExpenses = allExpenses.filter((e) => !fee.expenseIds.includes(e.id));

  return (
    <div style={{ border: "1px solid var(--pico-muted-border-color)", borderRadius: "var(--pico-border-radius)", padding: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: "0.9em" }}>
          <strong>{fee.description ?? `Fee #${fee.id}`}</strong>
          {fee.date && <span style={{ marginLeft: "0.75rem", color: "var(--pico-muted-color)" }}>{formatDate(fee.date)}</span>}
          {fee.amount != null && <span style={{ marginLeft: "0.75rem" }}><MoneyDisplay pennies={fee.amount} /></span>}
        </div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button className="secondary outline" style={{ padding: "0.15em 0.4em", fontSize: "0.8em" }} onClick={onEdit}>Edit</button>
          <button className="contrast outline" style={{ padding: "0.15em 0.4em", fontSize: "0.8em" }} onClick={onDelete}>Delete</button>
        </div>
      </div>

      {/* Linked expenses */}
      <div style={{ marginTop: "0.5rem" }}>
        <small style={{ color: "var(--pico-muted-color)" }}>Linked expenses</small>
        {linkedExpenses.length > 0 ? (
          <ul style={{ margin: "0.25rem 0", paddingLeft: "1rem" }}>
            {linkedExpenses.map((exp) => (
              <li key={exp.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85em" }}>
                <span>{exp.description}</span>
                <button
                  type="button"
                  className="contrast outline"
                  style={{ padding: "0.1em 0.3em", fontSize: "0.8em" }}
                  onClick={() => onUnlinkExpense(exp.id)}
                >✕</button>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: "0.25rem 0", color: "var(--pico-muted-color)", fontSize: "0.85em" }}>No expenses linked.</p>
        )}
        {unlinkableExpenses.length > 0 && (
          <select
            value=""
            onChange={(e) => { if (e.target.value) onLinkExpense(Number(e.target.value)); }}
            style={{ marginTop: "0.25rem", fontSize: "0.85em" }}
          >
            <option value="">+ Link expense...</option>
            {unlinkableExpenses.map((exp) => (
              <option key={exp.id} value={exp.id}>{exp.description}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
