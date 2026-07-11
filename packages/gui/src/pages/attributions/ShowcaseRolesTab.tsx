import { useState } from "react";
import { usePeople } from "../../api/hooks/usePeople.js";
import { useCollapsibleAllocations } from "../../api/hooks/useCollapsibleAllocations.js";
import { useShowcaseRoles, useCreateRole, useUpdateRole, useDeleteRole } from "../../api/hooks/useAssignedRoles.js";
import {
  useFeeAllocationsByShowcase,
  useGenerateFeeAllocationsForShowcase,
} from "../../api/hooks/useFeeAllocations.js";
import Modal from "../../components/Modal.js";
import FormField from "../../components/FormField.js";
import { formatPersonName } from "../../utils/people.js";
import { ShowcaseFeeAllocationCard } from "../../components/ShowcaseFeeAllocationCard.js";

interface Props {
  showcaseId: number;
}

export default function ShowcaseRolesTab({ showcaseId }: Props) {
  const { data: roles = [] } = useShowcaseRoles(showcaseId);
  const { data: people = [] } = usePeople();
  const { data: feeAllocations = [] } = useFeeAllocationsByShowcase(showcaseId);

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const generateFeeAllocations = useGenerateFeeAllocationsForShowcase(showcaseId);
  const { toggle: toggleAllocationCollapse, isCollapsed: isAllocationCollapsed } = useCollapsibleAllocations(feeAllocations);

  const [showAddRole, setShowAddRole] = useState(false);
  const [roleForm, setRoleForm] = useState<{ roleName: string; personId: number | null }>({ roleName: "", personId: null });
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

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
              const isCollapsed = isAllocationCollapsed(allocation.id);
              return (
                <ShowcaseFeeAllocationCard
                  key={allocation.id}
                  showcaseId={showcaseId}
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
    </div>
  );
}
