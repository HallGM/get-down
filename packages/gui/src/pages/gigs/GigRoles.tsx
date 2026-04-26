import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useGig } from "../../api/hooks/useGigs.js";
import { useGigRoles, useCreateRole, useUpdateRole, useDeleteRole, useImportRolesFromServices } from "../../api/hooks/useAssignedRoles.js";
import { usePeople } from "../../api/hooks/usePeople.js";
import {
  useFeeAllocationsByGig,
  useGenerateFeeAllocations,
  useResetFeeAllocation,
  useAddFeeLineItem,
  useUpdateFeeLineItem,
  useRemoveFeeLineItem,
  useCreateFeeAllocationForGig,
  useDeleteFeeAllocation,
} from "../../api/hooks/useFeeAllocations.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import FormField from "../../components/FormField.js";
import Modal from "../../components/Modal.js";
import { useToast } from "../../components/Toast.js";
import { formatPersonName } from "../../utils/people.js";
import type { FeeAllocation, FeeAllocationLineItem } from "@get-down/shared";

export default function GigRoles() {
  const { id } = useParams<{ id: string }>();
  const gigId = Number(id);
  const { data: gig, isLoading: gigLoading, error: gigError } = useGig(gigId);
  const { data: roles = [] } = useGigRoles(gigId);
  const { data: people = [] } = usePeople();
  const { data: feeAllocations = [] } = useFeeAllocationsByGig(gigId);

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const importRoles = useImportRolesFromServices(gigId);
  const generateFeeAllocations = useGenerateFeeAllocations(gigId);
  const resetFeeAllocation = useResetFeeAllocation();
  const addLineItem = useAddFeeLineItem();
  const updateLineItem = useUpdateFeeLineItem();
  const removeLineItem = useRemoveFeeLineItem();
  const createFeeAllocation = useCreateFeeAllocationForGig(gigId);
  const deleteFeeAllocation = useDeleteFeeAllocation();
  const { showToast } = useToast();

  const [showAddRole, setShowAddRole] = useState(false);
  const [roleForm, setRoleForm] = useState<{ roleName: string; personId: number | null }>({ roleName: "", personId: null });
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showAddAllocation, setShowAddAllocation] = useState(false);
  const [addAllocationPersonId, setAddAllocationPersonId] = useState<number | null>(null);

  if (gigLoading) return <main className="container"><LoadingState /></main>;
  if (gigError || !gig) return <main className="container"><ErrorBanner error={gigError ?? "Gig not found"} /></main>;

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    await createRole.mutateAsync({ gigId, roleName: roleForm.roleName, personId: roleForm.personId ?? undefined });
    setShowAddRole(false);
    setRoleForm({ roleName: "", personId: null });
  }

  async function handleImportRoles() {
    const imported = await importRoles.mutateAsync();
    if (imported.length === 0) {
      showToast("No roles found on attached services", "success");
    }
  }

  async function handleGenerateFeeAllocations(force: boolean) {
    const result = await generateFeeAllocations.mutateAsync(force);
    if (result && !Array.isArray(result) && "conflict" in result && result.conflict) {
      setShowGenerateConfirm(true);
    } else {
      setShowGenerateConfirm(false);
    }
  }

  async function handleReset(allocationId: number) {
    await resetFeeAllocation.mutateAsync(allocationId);
  }

  async function handleAddAllocation(e: React.FormEvent) {
    e.preventDefault();
    await createFeeAllocation.mutateAsync(addAllocationPersonId ? { personId: addAllocationPersonId } : {});
    setShowAddAllocation(false);
    setAddAllocationPersonId(null);
  }

  function allocationTitle(allocation: FeeAllocation): string {
    if (allocation.personId) {
      const person = people.find((p) => p.id === allocation.personId);
      if (person) return formatPersonName(person);
    }
    const role = roles.find((r) => r.feeAllocationId === allocation.id);
    if (role) return `Unassigned – ${role.roleName}`;
    return `Allocation #${allocation.id}`;
  }

  return (
    <main className="container">
      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to="/gigs">Gigs</Link></li>
          <li><Link to={`/gigs/${gigId}`}>{gig.firstName} {gig.lastName}</Link></li>
          <li>Roles &amp; Fees</li>
        </ul>
      </nav>

      <h1>Roles &amp; Fees</h1>
      <p style={{ color: "var(--pico-muted-color)" }}>{gig.firstName} {gig.lastName}</p>

      {/* Assigned Roles */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Assigned Roles</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="secondary outline"
              aria-busy={generateFeeAllocations.isPending}
              disabled={generateFeeAllocations.isPending}
              onClick={() => handleGenerateFeeAllocations(false)}
            >
              Generate fee allocations
            </button>
            <button
              className="secondary outline"
              aria-busy={importRoles.isPending}
              disabled={importRoles.isPending}
              onClick={handleImportRoles}
            >
              Import from services
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
                          gigId,
                          input: { personId: val === "" ? null : Number(val) },
                        });
                      }}
                      style={{ margin: 0 }}
                    >
                      <option value="">—</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {formatPersonName(p)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="contrast outline"
                      style={{ padding: "0.2em 0.5em" }}
                      onClick={() => deleteRole.mutate({ id: r.id, gigId })}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--pico-muted-color)" }}>No roles assigned.</p>
        )}
      </section>

      {/* Fee Allocations */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Fee Allocations</h2>
          <button className="secondary" onClick={() => setShowAddAllocation(true)}>+ Add allocation</button>
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
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        className="secondary outline"
                        style={{ padding: "0.15em 0.5em", fontSize: "0.85em" }}
                        aria-busy={resetFeeAllocation.isPending}
                        disabled={resetFeeAllocation.isPending}
                        onClick={() => handleReset(allocation.id)}
                      >
                        Reset to defaults
                      </button>
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
                    </div>
                  </header>

                  {/* Linked roles */}
                  <div style={{ marginBottom: "0.75rem" }}>
                    <strong style={{ fontSize: "0.85em" }}>Linked roles</strong>
                    {linkedRoles.length > 0 ? (
                      <ul style={{ margin: "0.25rem 0", paddingLeft: "1rem" }}>
                        {linkedRoles.map((r) => (
                          <li key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>{r.roleName}{r.personId ? ` (${formatPersonName(people.find((p) => p.id === r.personId)!)})` : ""}</span>
                            <button
                              type="button"
                              className="contrast outline"
                              style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                              onClick={() => {
                                updateRole.mutate({ id: r.id, gigId, input: { feeAllocationId: null } });
                              }}
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
                          const roleId = Number(e.target.value);
                          updateRole.mutate({ id: roleId, gigId, input: { feeAllocationId: allocation.id } });
                        }}
                        style={{ margin: "0.25rem 0", fontSize: "0.85em" }}
                      >
                        <option value="">+ Link role…</option>
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
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Role modal */}
      <Modal open={showAddRole} onClose={() => { setShowAddRole(false); setRoleForm({ roleName: "", personId: null }); }} title="Add Role">
        <form onSubmit={handleAddRole}>
          <FormField label="Role Name" value={roleForm.roleName} onChange={(e) => setRoleForm((f) => ({ ...f, roleName: e.target.value }))} required placeholder="e.g. Lead Vocalist" />
          <label>
            <span style={{ display: "block", marginBottom: "0.25rem" }}>Person (optional)</span>
            <select
              value={roleForm.personId ?? ""}
              onChange={(e) => setRoleForm((f) => ({ ...f, personId: e.target.value === "" ? null : Number(e.target.value) }))}
              style={{ width: "100%" }}
            >
              <option value="">— None —</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPersonName(p)}
                </option>
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
        <p>Fee allocations already exist for this gig. Regenerating will delete all existing allocations and line items and recreate them from current role fees.</p>
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={() => setShowGenerateConfirm(false)}>Cancel</button>
          <button
            type="button"
            className="contrast"
            aria-busy={generateFeeAllocations.isPending}
            disabled={generateFeeAllocations.isPending}
            onClick={() => handleGenerateFeeAllocations(true)}
          >
            Regenerate
          </button>
        </footer>
      </Modal>

      {/* Add Allocation modal */}
      <Modal open={showAddAllocation} onClose={() => { setShowAddAllocation(false); setAddAllocationPersonId(null); }} title="Add Fee Allocation">
        <form onSubmit={handleAddAllocation}>
          <label>
            <span style={{ display: "block", marginBottom: "0.25rem" }}>Person (optional)</span>
            <select
              value={addAllocationPersonId ?? ""}
              onChange={(e) => setAddAllocationPersonId(e.target.value === "" ? null : Number(e.target.value))}
              style={{ width: "100%" }}
            >
              <option value="">— None —</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{formatPersonName(p)}</option>
              ))}
            </select>
          </label>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button type="button" className="secondary" onClick={() => { setShowAddAllocation(false); setAddAllocationPersonId(null); }}>Cancel</button>
            <button type="submit" aria-busy={createFeeAllocation.isPending} disabled={createFeeAllocation.isPending}>Add</button>
          </footer>
        </form>
      </Modal>
    </main>
  );
}

// ─── Fee Allocation Panel ─────────────────────────────────────────────────────

interface FeeAllocationPanelProps {
  allocation: FeeAllocation;
  onAddLineItem?: (description: string, amount: number) => void;
  onUpdateLineItem?: (item: FeeAllocationLineItem, description: string, amount: number) => void;
  onRemoveLineItem?: (item: FeeAllocationLineItem) => void;
}

function FeeAllocationPanel({
  allocation,
  onAddLineItem,
  onUpdateLineItem,
  onRemoveLineItem,
}: FeeAllocationPanelProps) {
  const [addDesc, setAddDesc] = useState("");
  const [addAmt, setAddAmt] = useState<number | "">("");
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmt, setEditAmt] = useState<number | "">("");

  const lineItems = allocation.lineItems ?? [];
  const total = lineItems.reduce((sum, li) => sum + (li.amount ?? 0), 0);

  function startEditItem(li: FeeAllocationLineItem) {
    setEditingItem(li.id);
    setEditDesc(li.description ?? "");
    setEditAmt(li.amount ?? "");
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addDesc || addAmt === "") return;
    onAddLineItem?.(addDesc, Number(addAmt));
    setAddDesc("");
    setAddAmt("");
  }

  function handleEditSubmit(e: React.FormEvent, li: FeeAllocationLineItem) {
    e.preventDefault();
    if (!editDesc || editAmt === "") return;
    onUpdateLineItem?.(li, editDesc, Number(editAmt));
    setEditingItem(null);
  }

  return (
    <div>
      {lineItems.length > 0 ? (
        <table style={{ fontSize: "0.9em" }}>
          <thead>
            <tr><th>Description</th><th>Amount</th><th style={{ width: "1%" }}></th></tr>
          </thead>
          <tbody>
            {lineItems.map((li) =>
              editingItem === li.id ? (
                <tr key={li.id}>
                  <td>
                    <form onSubmit={(e) => handleEditSubmit(e, li)} style={{ display: "contents" }}>
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        style={{ width: "100%", margin: 0 }}
                        required
                        autoFocus
                      />
                    </form>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editAmt}
                      onChange={(e) => setEditAmt(e.target.value === "" ? "" : Number(e.target.value))}
                      style={{ width: "100%", margin: 0 }}
                      min={0}
                      required
                    />
                  </td>
                  <td style={{ display: "flex", gap: "0.3rem" }}>
                    <button
                      type="button"
                      className="secondary outline"
                      style={{ padding: "0.15em 0.4em", fontSize: "0.85em" }}
                      onClick={(e) => handleEditSubmit(e as unknown as React.FormEvent, li)}
                    >✓</button>
                    <button
                      type="button"
                      className="secondary outline"
                      style={{ padding: "0.15em 0.4em", fontSize: "0.85em" }}
                      onClick={() => setEditingItem(null)}
                    >✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={li.id}>
                  <td>{li.description ?? "—"}</td>
                  <td><MoneyDisplay pennies={li.amount} /></td>
                  <td style={{ display: "flex", gap: "0.3rem" }}>
                    <button
                      type="button"
                      className="secondary outline"
                      style={{ padding: "0.15em 0.4em", fontSize: "0.85em" }}
                      onClick={() => startEditItem(li)}
                    >Edit</button>
                    <button
                      type="button"
                      className="contrast outline"
                      style={{ padding: "0.15em 0.4em", fontSize: "0.85em" }}
                      onClick={() => onRemoveLineItem?.(li)}
                    >✕</button>
                  </td>
                </tr>
              )
            )}
            <tr>
              <td><strong>Total</strong></td>
              <td><strong><MoneyDisplay pennies={total} /></strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p style={{ color: "var(--pico-muted-color)", fontSize: "0.9em" }}>No line items yet.</p>
      )}

      {/* Add line item */}
      <form onSubmit={handleAddSubmit} style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "flex-end" }}>
        <div style={{ flex: 2 }}>
          <input
            placeholder="Description"
            value={addDesc}
            onChange={(e) => setAddDesc(e.target.value)}
            style={{ margin: 0 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <input
            type="number"
            placeholder="Amount (p)"
            value={addAmt}
            onChange={(e) => setAddAmt(e.target.value === "" ? "" : Number(e.target.value))}
            style={{ margin: 0 }}
            min={0}
          />
        </div>
        <button
          type="submit"
          className="secondary outline"
          style={{ padding: "0.3em 0.7em", width: "auto" }}
          disabled={!addDesc || addAmt === ""}
        >
          + Add
        </button>
      </form>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
