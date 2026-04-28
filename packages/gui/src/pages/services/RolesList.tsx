import { useState } from "react";
import { Link } from "react-router-dom";
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from "../../api/hooks/useRoles.js";
import type { Role } from "@get-down/shared";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import MoneyField from "../../components/MoneyField.js";
import Modal from "../../components/Modal.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";

export default function RolesList() {
  const { data: roles, isLoading, error } = useRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState<number | undefined>(undefined);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [editName, setEditName] = useState("");
  const [editFee, setEditFee] = useState<number | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createRole.mutateAsync({ name: newName, fee: newFee });
    setShowCreate(false);
    setNewName("");
    setNewFee(undefined);
  }

  function openEdit(role: Role) {
    setEditTarget(role);
    setEditName(role.name);
    setEditFee(role.fee ?? undefined);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    await updateRole.mutateAsync({ id: editTarget.id, input: { name: editName, fee: editFee } });
    setEditTarget(null);
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to="/services">Services</Link></li>
          <li>Manage Roles</li>
        </ul>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <hgroup>
          <h1>Roles</h1>
          <p>Define the roles that can be attached to services and imported onto gigs.</p>
        </hgroup>
        <button onClick={() => setShowCreate(true)}>+ New Role</button>
      </div>

      {roles && roles.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Default Fee</th>
              <th style={{ width: "1%" }}></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td><MoneyDisplay pennies={role.fee} /></td>
                <td style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button
                    className="secondary outline"
                    style={{ padding: "0.2em 0.5em" }}
                    onClick={() => openEdit(role)}
                  >
                    Edit
                  </button>
                  <button
                    className="contrast outline"
                    style={{ padding: "0.2em 0.5em" }}
                    onClick={() => setDeleteTarget(role)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: "var(--pico-muted-color)" }}>No roles yet. Add one to get started.</p>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setNewName(""); setNewFee(undefined); }} title="New Role">
        <form onSubmit={handleCreate}>
          <FormField
            label="Role name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            placeholder="e.g. Guitarist"
          />
          <MoneyField
            label="Default fee"
            value={newFee}
            onChange={setNewFee}
            min={0}
          />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => { setShowCreate(false); setNewName(""); setNewFee(undefined); }}>Cancel</button>
            <button type="submit" aria-busy={createRole.isPending} disabled={createRole.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Role">
        <form onSubmit={handleUpdate}>
          <FormField
            label="Role name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <MoneyField
            label="Default fee"
            value={editFee}
            onChange={setEditFee}
            min={0}
          />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" aria-busy={updateRole.isPending} disabled={updateRole.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={deleteTarget.name}
          onConfirm={async () => {
            await deleteRole.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteRole.isPending}
        />
      )}
    </main>
  );
}
