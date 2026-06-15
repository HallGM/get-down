import { useState } from "react";
import type { CreateRehearsalRequest, Rehearsal } from "@get-down/shared";
import {
  useGigRehearsals,
  useCreateGigRehearsal,
  useUpdateGigRehearsal,
  useLinkExistingRehearsal,
  useUnlinkGigRehearsal,
  useSetRehearsalExpense,
  useClearRehearsalExpense,
  useUpdateRehearsalCostShare,
} from "../../api/hooks/useGigRehearsals.js";
import { useRehearsals } from "../../api/hooks/useRehearsals.js";
import { useExpenses } from "../../api/hooks/useExpenses.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import MoneyField from "../../components/MoneyField.js";
import FormField from "../../components/FormField.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import ExpensePickerModal from "../../components/ExpensePickerModal.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import { formatPennies } from "../../utils/money.js";

interface Props {
  gigId: number;
}

const EMPTY_REHEARSAL: CreateRehearsalRequest = { name: "", date: "" };

export default function GigRehearsalsTab({ gigId }: Props) {
  const { data: rehearsals = [] } = useGigRehearsals(gigId);
  const { data: allRehearsals = [] } = useRehearsals();
  const { data: allExpenses = [] } = useExpenses();
  const createGigRehearsal = useCreateGigRehearsal(gigId);
  const updateGigRehearsal = useUpdateGigRehearsal(gigId);
  const linkExistingRehearsal = useLinkExistingRehearsal(gigId);
  const unlinkGigRehearsal = useUnlinkGigRehearsal(gigId);
  const setRehearsalExpense = useSetRehearsalExpense(gigId);
  const clearRehearsalExpense = useClearRehearsalExpense(gigId);
  const updateCostShare = useUpdateRehearsalCostShare(gigId);

  const [showCreateRehearsal, setShowCreateRehearsal] = useState(false);
  const [rehearsalForm, setRehearsalForm] = useState<CreateRehearsalRequest>(EMPTY_REHEARSAL);
  const [rehearsalExtraGigIds, setRehearsalExtraGigIds] = useState<number[]>([]);
  const [editRehearsal, setEditRehearsal] = useState<Rehearsal | null>(null);
  const [editRehearsalForm, setEditRehearsalForm] = useState<Partial<CreateRehearsalRequest>>({});
  const [deleteRehearsalTarget, setDeleteRehearsalTarget] = useState<Rehearsal | null>(null);
  const [showLinkRehearsal, setShowLinkRehearsal] = useState(false);
  const [expensePickerRehearsal, setExpensePickerRehearsal] = useState<Rehearsal | null>(null);
  const [costShareRehearsal, setCostShareRehearsal] = useState<Rehearsal | null>(null);
  const [costShareValue, setCostShareValue] = useState<number | undefined>(undefined);

  const linkedRehearsalIds = new Set(rehearsals.map((r) => r.id));
  const unlinkableRehearsals = allRehearsals.filter((r) => !linkedRehearsalIds.has(r.id));

  const createAllGigCount = 1 + rehearsalExtraGigIds.length;
  const suggestedSplit = rehearsalForm.cost && createAllGigCount > 1
    ? Math.floor(rehearsalForm.cost / createAllGigCount)
    : null;

  async function handleCreateRehearsal(e: React.FormEvent) {
    e.preventDefault();
    await createGigRehearsal.mutateAsync({ ...rehearsalForm, gigIds: rehearsalExtraGigIds });
    setShowCreateRehearsal(false);
    setRehearsalForm(EMPTY_REHEARSAL);
    setRehearsalExtraGigIds([]);
  }

  async function handleUpdateRehearsal(e: React.FormEvent) {
    e.preventDefault();
    if (!editRehearsal) return;
    await updateGigRehearsal.mutateAsync({ id: editRehearsal.id, input: editRehearsalForm });
    setEditRehearsal(null);
  }

  async function handleRemoveRehearsal(rehearsal: Rehearsal) {
    if ((rehearsal.gigCount ?? 1) > 1) {
      await unlinkGigRehearsal.mutateAsync(rehearsal.id);
    } else {
      setDeleteRehearsalTarget(rehearsal);
    }
  }

  async function handleConfirmDeleteRehearsal() {
    if (!deleteRehearsalTarget) return;
    await unlinkGigRehearsal.mutateAsync(deleteRehearsalTarget.id);
    setDeleteRehearsalTarget(null);
  }

  async function handleLinkExpense(expense: { id: number }) {
    if (!expensePickerRehearsal) return;
    await setRehearsalExpense.mutateAsync({ rehearsalId: expensePickerRehearsal.id, expenseId: expense.id });
    setExpensePickerRehearsal(null);
  }

  async function handleUpdateCostShare(e: React.FormEvent) {
    e.preventDefault();
    if (!costShareRehearsal || costShareValue == null) return;
    await updateCostShare.mutateAsync({ rehearsalId: costShareRehearsal.id, costShare: costShareValue });
    setCostShareRehearsal(null);
  }

  return (
    <>
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Rehearsals</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {unlinkableRehearsals.length > 0 && (
              <button className="secondary outline" onClick={() => setShowLinkRehearsal(true)}>
                + Link existing
              </button>
            )}
            <button className="secondary" onClick={() => setShowCreateRehearsal(true)}>
              + New Rehearsal
            </button>
          </div>
        </div>

        {rehearsals.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Location</th>
                <th>Cost</th>
                {rehearsals.some((r) => (r.gigCount ?? 1) > 1) && <th>This gig&apos;s share</th>}
                <th>Expense</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {rehearsals.map((r) => {
                const showShare = (r.gigCount ?? 1) > 1;
                return (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.location ?? "—"}</td>
                    <td>{r.cost != null ? <MoneyDisplay pennies={r.cost} /> : "—"}</td>
                    {rehearsals.some((rr) => (rr.gigCount ?? 1) > 1) && (
                      <td>
                        {showShare ? (
                          r.costShare != null ? <MoneyDisplay pennies={r.costShare} /> : "—"
                        ) : (
                          <span style={{ color: "var(--pico-muted-color)", fontSize: "0.85em" }}>n/a</span>
                        )}
                      </td>
                    )}
                    <td>
                      {r.expenseId ? (
                        <span style={{ fontSize: "0.85em" }}>
                          {r.expenseDescription ?? `#${r.expenseId}`}
                          {r.expenseAmount != null && <> · <MoneyDisplay pennies={r.expenseAmount} /></>}
                          <button
                            type="button"
                            className="contrast outline"
                            style={{ padding: "0.1em 0.4em", fontSize: "0.8em", marginLeft: "0.4rem" }}
                            aria-label="Unlink expense"
                            onClick={() => clearRehearsalExpense.mutate(r.id)}
                          >✕</button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="secondary outline"
                          style={{ padding: "0.2em 0.5em", fontSize: "0.85em" }}
                          onClick={() => setExpensePickerRehearsal(r)}
                        >
                          + Link expense
                        </button>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className="secondary outline"
                          style={{ padding: "0.2em 0.5em" }}
                          onClick={() => {
                            setEditRehearsal(r);
                            setEditRehearsalForm({ name: r.name, date: r.date, location: r.location, cost: r.cost, notes: r.notes });
                          }}
                        >
                          Edit
                        </button>
                        {showShare && (
                          <button
                            className="secondary outline"
                            style={{ padding: "0.2em 0.5em" }}
                            onClick={() => { setCostShareRehearsal(r); setCostShareValue(r.costShare); }}
                          >
                            Split
                          </button>
                        )}
                        <button
                          className="contrast outline"
                          style={{ padding: "0.2em 0.5em" }}
                          aria-label={`Remove rehearsal ${r.name}`}
                          onClick={() => handleRemoveRehearsal(r)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--pico-muted-color)" }}>No rehearsals linked to this gig yet.</p>
        )}
      </section>

      {/* Create rehearsal modal */}
      <Modal open={showCreateRehearsal} onClose={() => { setShowCreateRehearsal(false); setRehearsalForm(EMPTY_REHEARSAL); setRehearsalExtraGigIds([]); }} title="New Rehearsal">
        <form onSubmit={handleCreateRehearsal}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Name" value={rehearsalForm.name} onChange={(e) => setRehearsalForm((f) => ({ ...f, name: e.target.value }))} required />
            <FormField label="Date" type="date" value={rehearsalForm.date} onChange={(e) => setRehearsalForm((f) => ({ ...f, date: e.target.value }))} required />
            <FormField label="Location" value={rehearsalForm.location ?? ""} onChange={(e) => setRehearsalForm((f) => ({ ...f, location: e.target.value }))} />
            <MoneyField label="Cost (predicted)" value={rehearsalForm.cost} onChange={(p) => setRehearsalForm((f) => ({ ...f, cost: p ?? undefined }))} min={0} />
          </div>
          <FormField as="textarea" label="Notes" value={rehearsalForm.notes ?? ""} onChange={(e) => setRehearsalForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />

          {allRehearsals !== undefined && (
            <div style={{ marginTop: "0.75rem" }}>
              <small><strong>Also link to other gigs (optional)</strong></small>
              <div style={{ marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: "12rem", overflowY: "auto" }}>
                {/* Multi-gig picker not yet implemented */}
              </div>
            </div>
          )}

          {suggestedSplit != null && (
            <p style={{ color: "var(--pico-muted-color)", fontSize: "0.85em", marginTop: "0.5rem" }}>
              Suggested split: <MoneyDisplay pennies={suggestedSplit} /> per gig
            </p>
          )}

          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => { setShowCreateRehearsal(false); setRehearsalForm(EMPTY_REHEARSAL); }}>Cancel</button>
            <button type="submit" aria-busy={createGigRehearsal.isPending} disabled={createGigRehearsal.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      {/* Edit rehearsal modal */}
      <Modal open={!!editRehearsal} onClose={() => setEditRehearsal(null)} title="Edit Rehearsal">
        <form onSubmit={handleUpdateRehearsal}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Name" value={editRehearsalForm.name ?? ""} onChange={(e) => setEditRehearsalForm((f) => ({ ...f, name: e.target.value }))} required />
            <FormField label="Date" type="date" value={toInputDate(editRehearsalForm.date)} onChange={(e) => setEditRehearsalForm((f) => ({ ...f, date: e.target.value }))} required />
            <FormField label="Location" value={editRehearsalForm.location ?? ""} onChange={(e) => setEditRehearsalForm((f) => ({ ...f, location: e.target.value }))} />
            <MoneyField label="Cost (predicted)" value={editRehearsalForm.cost} onChange={(p) => setEditRehearsalForm((f) => ({ ...f, cost: p ?? undefined }))} min={0} />
          </div>
          <FormField as="textarea" label="Notes" value={editRehearsalForm.notes ?? ""} onChange={(e) => setEditRehearsalForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          {editRehearsal && (editRehearsal.gigCount ?? 1) > 1 && editRehearsal.cost != null && (
            <p style={{ color: "var(--pico-color-amber-500)", fontSize: "0.85em", marginTop: "0.5rem" }}>
              This rehearsal is shared across {editRehearsal.gigCount} gigs. Changing the cost will not automatically update cost shares. Use the Split button to review the split.
            </p>
          )}
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setEditRehearsal(null)}>Cancel</button>
            <button type="submit" aria-busy={updateGigRehearsal.isPending} disabled={updateGigRehearsal.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {/* Link existing rehearsal modal */}
      <Modal open={showLinkRehearsal} onClose={() => setShowLinkRehearsal(false)} title="Link existing rehearsal">
        {unlinkableRehearsals.length === 0 ? (
          <p style={{ color: "var(--pico-muted-color)" }}>No other rehearsals available to link.</p>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Date</th><th>Cost</th><th aria-label="Actions"></th></tr></thead>
            <tbody>
              {unlinkableRehearsals.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.cost != null ? <MoneyDisplay pennies={r.cost} /> : "—"}</td>
                  <td>
                    <button
                      className="secondary outline"
                      style={{ padding: "0.2em 0.5em" }}
                      onClick={async () => {
                        await linkExistingRehearsal.mutateAsync(r.id);
                        setShowLinkRehearsal(false);
                      }}
                      disabled={linkExistingRehearsal.isPending}
                      aria-busy={linkExistingRehearsal.isPending}
                    >
                      Link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <footer style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="secondary" onClick={() => setShowLinkRehearsal(false)}>Close</button>
        </footer>
      </Modal>

      {/* Cost share modal */}
      <Modal open={!!costShareRehearsal} onClose={() => setCostShareRehearsal(null)} title="Edit cost share">
        <form onSubmit={handleUpdateCostShare}>
          {costShareRehearsal && (
            <>
              <p style={{ fontSize: "0.9em", color: "var(--pico-muted-color)" }}>
                Total rehearsal cost: {costShareRehearsal.cost != null ? formatPennies(costShareRehearsal.cost) : "not set"}.
                This rehearsal is shared across {costShareRehearsal.gigCount} gigs.
              </p>
              <MoneyField
                label="This gig's share"
                value={costShareValue}
                onChange={(p) => setCostShareValue(p ?? undefined)}
                required
                min={0}
              />
              {updateCostShare.error && (
                <ErrorBanner error={updateCostShare.error instanceof Error ? updateCostShare.error.message : "Failed to update cost share"} />
              )}
            </>
          )}
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setCostShareRehearsal(null)}>Cancel</button>
            <button type="submit" aria-busy={updateCostShare.isPending} disabled={updateCostShare.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {/* Expense picker for rehearsal */}
      <ExpensePickerModal
        open={!!expensePickerRehearsal}
        onClose={() => setExpensePickerRehearsal(null)}
        expenses={allExpenses.filter((e) => expensePickerRehearsal?.expenseId !== e.id)}
        onSelect={handleLinkExpense}
      />

      {/* Confirm delete rehearsal */}
      <ConfirmDelete
        open={!!deleteRehearsalTarget}
        itemName={deleteRehearsalTarget?.name ?? "this rehearsal"}
        onConfirm={handleConfirmDeleteRehearsal}
        onCancel={() => setDeleteRehearsalTarget(null)}
        loading={unlinkGigRehearsal.isPending}
      />
    </>
  );
}
