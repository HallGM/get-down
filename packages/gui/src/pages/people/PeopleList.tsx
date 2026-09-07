import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePeople, useCreatePerson, useGeneratePerformerToken } from "../../api/hooks/usePeople.js";
import type { CreatePersonRequest, Person } from "@get-down/shared";
import DataTable, { type Column, multiWordFilter } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import PersonEditDialog from "../../components/PersonEditDialog.js";
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
  const generateToken = useGeneratePerformerToken();
  const { showToast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreatePersonRequest>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Person | null>(null);

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

  function openEdit(person: Person) {
    setEditTarget(person);
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
         onRowClick={(p) => void navigate(`/people/${p.id}`)}
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

      <PersonEditDialog person={editTarget} onClose={() => setEditTarget(null)} />
    </main>
  );
}
