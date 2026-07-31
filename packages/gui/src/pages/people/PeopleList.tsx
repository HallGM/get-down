import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson, useGeneratePerformerToken } from "../../api/hooks/usePeople.js";
import type { CreatePersonRequest, UpdatePersonRequest, Person } from "@get-down/shared";
import DataTable, { type Column, multiWordFilter } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import PersonFormFields from "../../components/PersonFormFields.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import BooleanCell from "../../components/BooleanCell.js";
import { useToast } from "../../components/Toast.js";

const COLUMNS: Column<Person>[] = [
  { key: "firstName", header: "First Name", sortable: true },
  { key: "lastName", header: "Last Name", sortable: true, render: (p) => p.lastName ?? "—" },
  { key: "displayName", header: "Display Name", render: (p) => p.displayName ?? "—" },
  { key: "email", header: "Email", render: (p) => p.email ?? "—" },
  { key: "phone", header: "Phone", render: (p) => p.phone ?? "—" },
  { key: "isPartner", header: "Partner", render: (p) => <BooleanCell value={!!p.isPartner} /> },
  { key: "isActive", header: "Active", render: (p) => <BooleanCell value={!!p.isActive} /> },
];

const EMPTY_FORM: CreatePersonRequest = { firstName: "", isPartner: false, isActive: true };

/**
 * People-specific filter: searches first name, last name, display name, email, and phone.
 */
function filterPerson(person: Person, query: string): boolean {
  return multiWordFilter(query, [
    person.firstName,
    person.lastName ?? "",
    person.displayName ?? "",
    person.email ?? "",
    person.phone ?? "",
  ]);
}

export default function PeopleList() {
  const navigate = useNavigate();
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
      businessName: person.businessName,
      addressLine1: person.addressLine1,
      addressLine2: person.addressLine2,
      addressTown: person.addressTown,
      addressCounty: person.addressCounty,
      addressPostcode: person.addressPostcode,
      accountNumber: person.accountNumber,
      sortCode: person.sortCode,
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
              <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={(e) => { e.stopPropagation(); void navigate(`/people/${p.id}/invoices`); }}>Invoices</button>
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
        filterFn={filterPerson}
      />

      {/* Create */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Person">
        <form onSubmit={handleCreate}>
          <PersonFormFields values={form} onFieldChange={setField} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createPerson.isPending} disabled={createPerson.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Person">
        <form onSubmit={handleUpdate}>
          <PersonFormFields
            values={editForm}
            onFieldChange={(field, value) => setEditForm((f) => ({ ...f, [field]: value }))}
            showActive
          />
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
          onConfirm={async () => {
            try {
              await deletePerson.mutateAsync(deleteTarget.id);
            } finally {
              setDeleteTarget(null);
            }
          }}
          onCancel={() => setDeleteTarget(null)}
          loading={deletePerson.isPending}
        />
      )}
    </main>
  );
}
