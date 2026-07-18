import { useState } from "react";
import { useParams } from "react-router-dom";
import { useGig } from "../../api/hooks/useGigs.js";
import { useCollapsibleAllocations } from "../../api/hooks/useCollapsibleAllocations.js";
import { useGigRoles, useCreateRole, useUpdateRole, useDeleteRole, useImportRolesFromServices } from "../../api/hooks/useAssignedRoles.js";
import { usePeople } from "../../api/hooks/usePeople.js";
import {
  useFeeAllocationsByGig,
  useGenerateFeeAllocations,
  useCreateFeeAllocationForGig,
} from "../../api/hooks/useFeeAllocations.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import FormField from "../../components/FormField.js";
import Modal from "../../components/Modal.js";
import { useToast } from "../../components/Toast.js";
import { formatPersonName } from "../../utils/people.js";
import { GigFeeAllocationCard } from "../../components/GigFeeAllocationCard.js";

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
  const createFeeAllocation = useCreateFeeAllocationForGig(gigId);
  const { showToast } = useToast();

  const [showAddRole, setShowAddRole] = useState(false);
  const [roleForm, setRoleForm] = useState<{ roleName: string; personId: number | null }>({ roleName: "", personId: null });
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showAddAllocation, setShowAddAllocation] = useState(false);
  const [addAllocationPersonId, setAddAllocationPersonId] = useState<number | null>(null);
  const { toggle: toggleAllocationCollapse, isCollapsed: isAllocationCollapsed } = useCollapsibleAllocations(feeAllocations);

  if (gigLoading) return <LoadingState />;
  if (gigError || !gig) return <ErrorBanner error={gigError ?? "Gig not found"} />;

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

  async function handleAddAllocation(e: React.FormEvent) {
    e.preventDefault();
    await createFeeAllocation.mutateAsync(addAllocationPersonId ? { personId: addAllocationPersonId } : {});
    setShowAddAllocation(false);
    setAddAllocationPersonId(null);
  }

  return (
    <>
       {/* Assigned Roles */}
       <section>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
           <h2>Assigned Roles</h2>
           <div style={{ display: "flex", gap: "0.5rem" }}>
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
           <div style={{ display: "flex", gap: "0.5rem" }}>
             <button
               className="secondary outline"
               aria-busy={generateFeeAllocations.isPending}
               disabled={generateFeeAllocations.isPending}
               onClick={() => handleGenerateFeeAllocations(false)}
             >
               Generate fee allocations
             </button>
             <button className="secondary" onClick={() => setShowAddAllocation(true)}>+ Add allocation</button>
           </div>
         </div>
        {feeAllocations.length === 0 ? (
          <p style={{ color: "var(--pico-muted-color)" }}>
            No fee allocations yet. Assign roles above, then click "Generate fee allocations".
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {feeAllocations.map((allocation) => {
              const isCollapsed = isAllocationCollapsed(allocation.id);
              return (
                <GigFeeAllocationCard
                  key={allocation.id}
                  gigId={gigId}
                  allocationId={allocation.id}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleAllocationCollapse(allocation.id)}
                />
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
    </>
  );
}
