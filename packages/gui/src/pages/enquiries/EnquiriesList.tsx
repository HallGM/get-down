import { useState } from "react";
import { Link } from "react-router-dom";
import { useEnquiries, useCreateEnquiry, useDeleteEnquiry } from "../../api/hooks/useEnquiries.js";
import type { CreateEnquiryRequest } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import { formatDate } from "../../utils/date.js";
import type { EnquiryResponse } from "@get-down/shared";

const COLUMNS: Column<EnquiryResponse>[] = [
  { key: "createdAt", header: "Received", sortable: true, render: (e) => formatDate(e.createdAt) },
  { key: "firstName", header: "Name", sortable: true, render: (e) => `${e.firstName} ${e.lastName}` },
  { key: "email", header: "Email" },
  { key: "eventDate", header: "Event Date", render: (e) => formatDate(e.eventDate) },
  { key: "venueLocation", header: "Venue", render: (e) => e.venueLocation ?? "—" },
];

const EMPTY_FORM: CreateEnquiryRequest = {
  firstName: "",
  lastName: "",
  email: "",
  services: [],
};

export default function EnquiriesList() {
  const { data: enquiries, isLoading, error } = useEnquiries();
  const createEnquiry = useCreateEnquiry();
  const deleteEnquiry = useDeleteEnquiry();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateEnquiryRequest>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<EnquiryResponse | null>(null);

  function setField(field: keyof CreateEnquiryRequest, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createEnquiry.mutateAsync(form);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Enquiries</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to="/enquiries/email-generator" role="button" className="secondary">Email Generator</Link>
          <button onClick={() => setShowCreate(true)}>+ New Enquiry</button>
        </div>
      </div>

      <DataTable<EnquiryResponse>
        columns={COLUMNS}
        data={enquiries ?? []}
        emptyMessage="No enquiries yet."
        filterPlaceholder="Search enquiries…"
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Enquiry">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="First Name" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} required />
            <FormField label="Last Name" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} required />
            <FormField label="Partner Name" value={form.partnersName ?? ""} onChange={(e) => setField("partnersName", e.target.value)} />
            <FormField label="Email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} required />
            <FormField label="Phone" type="tel" value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} />
            <FormField label="Event Date" type="date" value={form.eventDate ?? ""} onChange={(e) => setField("eventDate", e.target.value)} />
            <FormField label="Venue / Location" value={form.venueLocation ?? ""} onChange={(e) => setField("venueLocation", e.target.value)} />
          </div>
          <FormField as="textarea" label="Message" value={form.message ?? ""} onChange={(e) => setField("message", e.target.value)} rows={4} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createEnquiry.isPending} disabled={createEnquiry.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          onConfirm={async () => {
            await deleteEnquiry.mutateAsync(Number(deleteTarget.id));
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteEnquiry.isPending}
        />
      )}
    </main>
  );
}
