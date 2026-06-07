import { useState } from "react";
import type { FeeAllocation, Expense } from "@get-down/shared";
import { usePeople } from "../../api/hooks/usePeople.js";
import { useShowcaseRoles, useCreateRole, useUpdateRole, useDeleteRole } from "../../api/hooks/useAssignedRoles.js";
import {
  useFeeAllocationsByShowcase,
  useGenerateFeeAllocationsForShowcase,
  useDeleteFeeAllocation,
  useAddFeeLineItem,
  useUpdateFeeLineItem,
  useRemoveFeeLineItem,
  useLinkExpenseToAllocation,
  useUnlinkExpenseFromAllocation,
} from "../../api/hooks/useFeeAllocations.js";
import { useExpenses, useDeleteExpense } from "../../api/hooks/useExpenses.js";
import { useFeeAllocations } from "../../api/hooks/useFeeAllocations.js";
import { FeeAllocationPanel } from "../../components/FeeAllocationPanel.js";
import Modal from "../../components/Modal.js";
import FormField from "../../components/FormField.js";
import ExpensePickerModal from "../../components/ExpensePickerModal.js";
import ExpenseCreateModal from "../../components/ExpenseCreateModal.js";
import ExpenseModal from "../../components/ExpenseModal.js";
import { formatPersonName, resolvePersonName } from "../../utils/people.js";

interface Props {
  showcaseId: number;
}

export default function ShowcaseRolesTab({ showcaseId }: Props) {
  const { data: roles = [] } = useShowcaseRoles(showcaseId);
  const { data: people = [] } = usePeople();
  const { data: feeAllocations = [] } = useFeeAllocationsByShowcase(showcaseId);
  const { data: allExpenses = [] } = useExpenses();
  const { data: allAllocations = [] } = useFeeAllocations();

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const generateFeeAllocations = useGenerateFeeAllocationsForShowcase(showcaseId);
  const deleteFeeAllocation = useDeleteFeeAllocation();
  const addLineItem = useAddFeeLineItem();
  const updateLineItem = useUpdateFeeLineItem();
  const removeLineItem = useRemoveFeeLineItem();
  const linkExpense = useLinkExpenseToAllocation();
  const unlinkExpense = useUnlinkExpenseFromAllocation();
  const deleteExpense = useDeleteExpense();

  const [showAddRole, setShowAddRole] = useState(false);
  const [roleForm, setRoleForm] = useState<{ roleName: string; personId: number | null }>({ roleName: "", personId: null });
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  const [pickerAllocationId, setPickerAllocationId] = useState<number | null>(null);
  const [createAllocationId, setCreateAllocationId] = useState<number | null>(null);
  const [editExpenseId, setEditExpenseId] = useState<number | null>(null);
  const [unlinkConfirm, setUnlinkConfirm] = useState<{ allocationId: number; expense: Expense } | null>(null);

  const editExpense = editExpenseId != null ? (allExpenses.find((e) => e.id === editExpenseId) ?? null) : null;
  const pickerAllocation = pickerAllocationId != null ? feeAllocations.find((a) => a.id === pickerAllocationId) ?? null : null;

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    await createRole.mutateAsync({ showcaseId, roleName: roleForm.roleName, personId: roleForm.personId ?? undefined });
    setShowAddRole(false);
    setRoleForm({ roleName: "", personId: null });
  }

  async function handleGenerate(force: boolean) {
    const result = await generateFeeAllocations.mutateAsync(force);
    if (result && !Array.isArray(result) && "conflict" in result && result.conflict) {
      setShowGenerateConfirm(true);
    } else {
      setShowGenerateConfirm(false);
    }
  }

  function allocationTitle(allocation: FeeAllocation): string {
    if (allocation.personId) {
      const person = people.find((p) => p.id === allocation.personId);
      if (person) return formatPersonName(person);
    }
    const role = roles.find((r) => r.feeAllocationId === allocation.id);
    if (role) return `Unassigned. ${role.roleName}`;
    return `Allocation #${allocation.id}`;
  }

  return (
    <div>
      {/* Assigned Roles */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Assigned Roles</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="secondary outline"
              aria-busy={generateFeeAllocations.isPending}
              disabled={generateFeeAllocations.isPending}
              onClick={() => handleGenerate(false)}
            >
              Generate fee allocations
            </button>
            <button className="secondary" onClick={() => setShowAddRole(true)}>+ Add</button>
          </div>
        </div>

        {roles.length > 0 ? (
          <table>
            <thead><tr><th>Role</th><th>Person</th><th></th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.roleName}</td>
                  <td>
                    <select
                      value={r.personId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateRole.mutate({
                          id: r.id,
                          showcaseId,
                          input: { personId: val === "" ? null : Number(val) },
                        });
                      }}
                      style={{ margin: 0 }}
                    >
                      <option value="">—</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>{formatPersonName(p)}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="contrast outline"
                      style={{ padding: "0.2em 0.5em" }}
                      onClick={() => deleteRole.mutate({ id: r.id, showcaseId })}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--pico-muted-color)" }}>No roles assigned yet.</p>
        )}
      </section>

      {/* Fee Allocations */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Fee Allocations</h2>
        </div>

        {feeAllocations.length === 0 ? (
          <p style={{ color: "var(--pico-muted-color)" }}>
            No fee allocations yet. Assign roles above, then click "Generate fee allocations".
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {feeAllocations.map((allocation) => {
              const linkedRoles = roles.filter((r) => r.feeAllocationId === allocation.id);
              const unlinkedRoles = roles.filter((r) => !r.feeAllocationId);
              return (
                <article key={allocation.id} style={{ margin: 0 }}>
                  <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{allocationTitle(allocation)}</strong>
                    <button
                      type="button"
                      className="contrast outline"
                      style={{ padding: "0.15em 0.5em", fontSize: "0.85em" }}
                      aria-busy={deleteFeeAllocation.isPending}
                      disabled={deleteFeeAllocation.isPending}
                      onClick={() => deleteFeeAllocation.mutate(allocation.id)}
                    >
                      ✕
                    </button>
                  </header>

                  {/* Linked roles */}
                  <div style={{ marginBottom: "0.75rem" }}>
                    <strong style={{ fontSize: "0.85em" }}>Linked roles</strong>
                    {linkedRoles.length > 0 ? (
                      <ul style={{ margin: "0.25rem 0", paddingLeft: "1rem" }}>
                        {linkedRoles.map((r) => (
                          <li key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>
                              {r.roleName}
                              {r.personId ? ` (${resolvePersonName(people, r.personId)})` : ""}
                            </span>
                            <button
                              type="button"
                              className="contrast outline"
                              style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                              onClick={() => updateRole.mutate({ id: r.id, showcaseId, input: { feeAllocationId: null } })}
                            >✕</button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: "0.25rem 0", color: "var(--pico-muted-color)", fontSize: "0.85em" }}>No roles linked.</p>
                    )}
                    {unlinkedRoles.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          updateRole.mutate({ id: Number(e.target.value), showcaseId, input: { feeAllocationId: allocation.id } });
                        }}
                        style={{ margin: "0.25rem 0", fontSize: "0.85em" }}
                      >
                        <option value="">+ Link role...</option>
                        {unlinkedRoles.map((r) => (
                          <option key={r.id} value={r.id}>{r.roleName}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <FeeAllocationPanel
                    allocation={allocation}
                    onAddLineItem={(desc, amt) => addLineItem.mutate({ allocationId: allocation.id, input: { description: desc, amount: amt } })}
                    onUpdateLineItem={(li, desc, amt) => updateLineItem.mutate({ allocationId: allocation.id, lineItemId: li.id, input: { description: desc, amount: amt } })}
                    onRemoveLineItem={(li) => removeLineItem.mutate({ allocationId: allocation.id, lineItemId: li.id })}
                  />

                  <LinkedExpensesSection
                    allocation={allocation}
                    allExpenses={allExpenses}
                    onAddExpense={() => setCreateAllocationId(allocation.id)}
                    onBrowse={() => setPickerAllocationId(allocation.id)}
                    onEdit={(expense) => setEditExpenseId(expense.id)}
                    onRemove={(expense) => setUnlinkConfirm({ allocationId: allocation.id, expense })}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Role modal */}
      <Modal open={showAddRole} onClose={() => { setShowAddRole(false); setRoleForm({ roleName: "", personId: null }); }} title="Add Role">
        <form onSubmit={handleAddRole}>
          <FormField
            label="Role Name"
            value={roleForm.roleName}
            onChange={(e) => setRoleForm((f) => ({ ...f, roleName: e.target.value }))}
            required
            placeholder="e.g. Photographer"
          />
          <label>
            <span style={{ display: "block", marginBottom: "0.25rem" }}>Person (optional)</span>
            <select
              value={roleForm.personId ?? ""}
              onChange={(e) => setRoleForm((f) => ({ ...f, personId: e.target.value === "" ? null : Number(e.target.value) }))}
              style={{ width: "100%" }}
            >
              <option value="">— None —</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{formatPersonName(p)}</option>
              ))}
            </select>
          </label>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button type="button" className="secondary" onClick={() => { setShowAddRole(false); setRoleForm({ roleName: "", personId: null }); }}>Cancel</button>
            <button type="submit" aria-busy={createRole.isPending} disabled={createRole.isPending}>Add</button>
          </footer>
        </form>
      </Modal>

      {/* Generate confirm dialog */}
      <Modal open={showGenerateConfirm} onClose={() => setShowGenerateConfirm(false)} title="Overwrite existing fee allocations?">
        <p>Fee allocations already exist for this showcase. Regenerating will delete all existing allocations and recreate them from the current assigned roles.</p>
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={() => setShowGenerateConfirm(false)}>Cancel</button>
          <button
            type="button"
            className="contrast"
            aria-busy={generateFeeAllocations.isPending}
            disabled={generateFeeAllocations.isPending}
            onClick={() => handleGenerate(true)}
          >
            Regenerate
          </button>
        </footer>
      </Modal>

      {/* Expense create modal */}
      <ExpenseCreateModal
        open={createAllocationId != null}
        onClose={() => setCreateAllocationId(null)}
        onCreated={(expense) => {
          if (createAllocationId != null) {
            linkExpense.mutate({ allocationId: createAllocationId, expenseId: expense.id });
          }
          setCreateAllocationId(null);
        }}
      />

      {/* Expense picker modal */}
      <ExpensePickerModal
        open={pickerAllocationId != null}
        onClose={() => setPickerAllocationId(null)}
        expenses={allExpenses.filter((e) => !(pickerAllocation?.expenseIds ?? []).includes(e.id))}
        onSelect={(expense) => {
          if (pickerAllocationId != null) {
            linkExpense.mutate({ allocationId: pickerAllocationId, expenseId: expense.id });
          }
          setPickerAllocationId(null);
        }}
      />

      {/* Edit expense modal */}
      <ExpenseModal
        expense={editExpense}
        onClose={() => setEditExpenseId(null)}
        allAllocations={allAllocations}
      />

      {/* Unlink/delete confirm dialog */}
      <Modal open={!!unlinkConfirm} onClose={() => setUnlinkConfirm(null)} title="Remove linked expense">
        <p>
          Do you want to delete the expense <strong>{unlinkConfirm?.expense.description}</strong> entirely,
          or just remove the link?
        </p>
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={() => setUnlinkConfirm(null)}>Cancel</button>
          <button
            type="button"
            className="secondary outline"
            onClick={() => {
              if (unlinkConfirm) {
                unlinkExpense.mutate({ allocationId: unlinkConfirm.allocationId, expenseId: unlinkConfirm.expense.id });
              }
              setUnlinkConfirm(null);
            }}
          >
            Remove link only
          </button>
          <button
            type="button"
            className="contrast"
            aria-busy={deleteExpense.isPending}
            disabled={deleteExpense.isPending}
            onClick={async () => {
              if (unlinkConfirm) {
                await deleteExpense.mutateAsync(unlinkConfirm.expense.id);
              }
              setUnlinkConfirm(null);
            }}
          >
            Delete expense
          </button>
        </footer>
      </Modal>
    </div>
  );
}

// ─── Linked Expenses Section ──────────────────────────────────────────────────

interface LinkedExpensesSectionProps {
  allocation: FeeAllocation;
  allExpenses: Expense[];
  onAddExpense: () => void;
  onBrowse: () => void;
  onEdit: (expense: Expense) => void;
  onRemove: (expense: Expense) => void;
}

function LinkedExpensesSection({ allocation, allExpenses, onAddExpense, onBrowse, onEdit, onRemove }: LinkedExpensesSectionProps) {
  const linkedExpenses = allExpenses.filter((e) => allocation.expenseIds.includes(e.id));

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: "0.85em" }}>Linked expenses</strong>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button type="button" className="secondary outline" style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }} onClick={onAddExpense}>
            Add expense
          </button>
          <button type="button" className="secondary outline" style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }} onClick={onBrowse}>
            Browse...
          </button>
        </div>
      </div>
      {linkedExpenses.length > 0 ? (
        <ul style={{ margin: "0.25rem 0", paddingLeft: "1rem" }}>
          {linkedExpenses.map((e) => (
            <li key={e.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85em" }}>
              <button type="button" className="secondary outline" style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }} onClick={() => onEdit(e)}>
                Edit
              </button>
              <span>{e.description}</span>
              <button type="button" className="contrast outline" style={{ padding: "0.1em 0.3em", fontSize: "0.8em" }} onClick={() => onRemove(e)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: "0.25rem 0", color: "var(--pico-muted-color)", fontSize: "0.85em" }}>No expenses linked.</p>
      )}
    </div>
  );
}
