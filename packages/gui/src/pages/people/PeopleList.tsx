import { useState } from "react";
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson, useGeneratePerformerToken } from "../../api/hooks/usePeople.js";
import type { CreatePersonRequest, UpdatePersonRequest, Person } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import { useToast } from "../../components/Toast.js";

const COLUMNS: Column<Person>[] = [
  { key: "firstName", header: "First Name", sortable: true },
  { key: "lastName", header: "Last Name", sortable: true, render: (p) => p.lastName ?? "—" },
  { key: "displayName", header: "Display Name", render: (p) => p.displayName ?? "—" },
  { key: "email", header: "Email", render: (p) => p.email ?? "—" },
  { key: "phone", header: "Phone", render: (p) => p.phone ?? "—" },
  { key: "isPartner", header: "Partner", render: (p) => p.isPartner ? "✓" : "" },
  { key: "isActive", header: "Active", render: (p) => p.isActive ? "✓" : "—" },
];

const EMPTY_FORM: CreatePersonRequest = { firstName: "", isPartner: false, isActive: true };

export default function PeopleList() {
  const { data: people, isLoading, error } = usePeople();
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const generateToken = useGeneratePerformerToken();
  const { showToast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreatePersonRequest>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Person | null>(null);
  const [editForm, setEditForm] = useState<UpdatePersonRequest>({});
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);

  async function handleCopyLink(person: Person) {
    let token = person.performerToken;
    if (!token) {
      const updated = await generateToken.mutateAsync(person.id);
      token = updated.performerToken;
    }
    if (!token) return;
    const url = `${window.location.origin}/p/${token}`;
    await navigator.clipboard.writeText(url);
    showToast("Link copied!", "success");
  }

  function setField<K extends keyof CreatePersonRequest>(field: K, value: CreatePersonRequest[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createPerson.mutateAsync(form);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    await updatePerson.mutateAsync({ id: editTarget.id, input: editForm });
    setEditTarget(null);
  }

  function openEdit(person: Person) {
    setEditTarget(person);
    setEditForm({
      firstName: person.firstName,
      lastName: person.lastName,
      displayName: person.displayName,
      email: person.email,
      phone: person.phone,
      bankDetails: person.bankDetails,
      isPartner: person.isPartner,
      isActive: person.isActive,
    });
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>People</h1>
        <button onClick={() => setShowCreate(true)}>+ New Person</button>
      </div>

      <DataTable<Person>
        columns={[...COLUMNS, {
          key: "actions",
          header: "",
          render: (p) => (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={(e) => { e.stopPropagation(); openEdit(p); }}>Edit</button>
              <button
                className="secondary outline"
                style={{ padding: "0.2em 0.5em" }}
                title="Copy performer link"
                aria-busy={generateToken.isPending}
                onClick={(e) => { e.stopPropagation(); void handleCopyLink(p); }}
              >🔗</button>
            </div>
          ),
        }]}
        data={people ?? []}
        emptyMessage="No people yet."
        filterPlaceholder="Search people…"
      />

      {/* Create */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Person">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="First Name" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} required />
            <FormField label="Last Name" value={form.lastName ?? ""} onChange={(e) => setField("lastName", e.target.value)} />
            <FormField label="Display Name" value={form.displayName ?? ""} onChange={(e) => setField("displayName", e.target.value)} />
            <FormField label="Email" type="email" value={form.email ?? ""} onChange={(e) => setField("email", e.target.value)} />
            <FormField label="Phone" type="tel" value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} />
          </div>
          <label>
            <input type="checkbox" checked={!!form.isPartner} onChange={(e) => setField("isPartner", e.target.checked)} /> Partner
          </label>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createPerson.isPending} disabled={createPerson.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Person">
        <form onSubmit={handleUpdate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="First Name" value={editForm.firstName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} required />
            <FormField label="Last Name" value={editForm.lastName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} />
            <FormField label="Display Name" value={editForm.displayName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))} />
            <FormField label="Email" type="email" value={editForm.email ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            <FormField label="Phone" type="tel" value={editForm.phone ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <label><input type="checkbox" checked={!!editForm.isPartner} onChange={(e) => setEditForm((f) => ({ ...f, isPartner: e.target.checked }))} /> Partner</label>
          <label><input type="checkbox" checked={!!editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} /> Active</label>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="contrast outline" onClick={() => { setDeleteTarget(editTarget); setEditTarget(null); }}>Delete</button>
            <button type="button" className="secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" aria-busy={updatePerson.isPending} disabled={updatePerson.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={`${deleteTarget.firstName} ${deleteTarget.lastName ?? ""}`.trim()}
          onConfirm={async () => { await deletePerson.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
          loading={deletePerson.isPending}
        />
      )}
    </main>
  );
}
