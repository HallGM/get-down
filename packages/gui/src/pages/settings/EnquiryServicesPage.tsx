import { useState } from "react";
import type { EnquiryService } from "@get-down/shared";
import {
  useCreateEnquiryService,
  useDeleteEnquiryService,
  useEnquiryServices,
  useUpdateEnquiryService,
} from "../../api/hooks/useEnquiryServices.js";
import DataTable, { type Column } from "../../components/DataTable.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";

const COLUMNS: Column<EnquiryService>[] = [
  { key: "name", header: "Name", sortable: true },
  {
    key: "usageCount",
    header: "Used by",
    sortable: true,
    render: (service) => service.usageCount ? `${service.usageCount} gig${service.usageCount === 1 ? "" : "s"}` : "Unused",
  },
];

export default function EnquiryServicesPage() {
  const { data: services = [], isLoading, error } = useEnquiryServices();
  const create = useCreateEnquiryService();
  const update = useUpdateEnquiryService();
  const remove = useDeleteEnquiryService();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [editTarget, setEditTarget] = useState<EnquiryService | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EnquiryService | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    await create.mutateAsync({ name: newName });
    setNewName("");
    setShowCreate(false);
  }

  function openEdit(service: EnquiryService) {
    setEditTarget(service);
    setEditName(service.name);
  }

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!editTarget) return;
    if (editTarget.usageCount && editName.trim() !== editTarget.name) {
      const confirmed = window.confirm(
        "This option is assigned to one or more gigs. Renaming it changes the option shown for those enquiries. Continue?",
      );
      if (!confirmed) return;
    }
    await update.mutateAsync({ id: editTarget.id, input: { name: editName } });
    setEditTarget(null);
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  const mutationError = create.error ?? update.error ?? remove.error;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Enquiry services</h1>
        <button onClick={() => setShowCreate(true)}>+ New enquiry service</button>
      </div>

      {mutationError && <ErrorBanner error={mutationError} />}

      <DataTable<EnquiryService>
        columns={[...COLUMNS, {
          key: "actions",
          header: "",
          interactive: true,
          render: (service) => (
            <button
              className="secondary outline"
              style={{ padding: "0.2em 0.5em" }}
              onClick={() => openEdit(service)}
            >
              Edit
            </button>
          ),
        }]}
        data={services}
        emptyMessage="No enquiry services yet."
        filterPlaceholder="Search enquiry services…"
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New enquiry service">
        <form onSubmit={handleCreate}>
          <FormField label="Name" value={newName} onChange={(event) => setNewName(event.target.value)} required />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={create.isPending} disabled={create.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit enquiry service">
        <form onSubmit={handleUpdate}>
          <FormField label="Name" value={editName} onChange={(event) => setEditName(event.target.value)} required />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
            <button type="button" className="contrast outline" onClick={() => { setDeleteTarget(editTarget); setEditTarget(null); }}>Delete</button>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="secondary" onClick={() => setEditTarget(null)}>Cancel</button>
              <button type="submit" aria-busy={update.isPending} disabled={update.isPending}>Save</button>
            </div>
          </footer>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDelete
          open
          itemName={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          loading={remove.isPending}
          onConfirm={async () => {
            try {
              await remove.mutateAsync(deleteTarget.id);
            } finally {
              setDeleteTarget(null);
            }
          }}
        />
      )}
    </main>
  );
}
