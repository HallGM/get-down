import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGigs, useCreateGig, useDeleteGig } from "../../api/hooks/useGigs.js";
import type { CreateGigRequest } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import StatusBadge from "../../components/StatusBadge.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import { formatDate } from "../../utils/date.js";
import type { Gig } from "@get-down/shared";

type GigView = "upcoming" | "past" | "all";

const STATUS_OPTIONS = ["enquiry", "confirmed", "completed", "cancelled", "postponed"];

const COLUMNS: Column<Gig>[] = [
  { key: "date", header: "Date", sortable: true, render: (g) => formatDate(g.date) },
  { key: "firstName", header: "Name", sortable: true, render: (g) => `${g.firstName} ${g.lastName ?? ""}`.trim() },
  { key: "venueName", header: "Venue", sortable: true, render: (g) => g.venueName ?? "—" },
  { key: "location", header: "Location", sortable: true, render: (g) => g.location ?? "—" },
  { key: "status", header: "Status", render: (g) => <StatusBadge status={g.status} /> },
  { key: "totalPrice", header: "Total", render: (g) => <MoneyDisplay pennies={g.totalPrice} /> },
];

const EMPTY_FORM: CreateGigRequest = {
  firstName: "",
  lastName: "",
  date: "",
  status: "enquiry",
};

export default function GigsList() {
  const navigate = useNavigate();
  const { data: gigs, isLoading, error } = useGigs();
  const createGig = useCreateGig();
  const deleteGig = useDeleteGig();

  const [view, setView] = useState<GigView>("upcoming");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateGigRequest>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Gig | null>(null);

  const displayedGigs = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const all = gigs ?? [];
    if (view === "upcoming") {
      return [...all].filter((g) => g.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    }
    if (view === "past") {
      return [...all].filter((g) => g.date < today).sort((a, b) => b.date.localeCompare(a.date));
    }
    // "all"
    return [...all].sort((a, b) => a.date.localeCompare(b.date));
  }, [gigs, view]);

  function setField(field: keyof CreateGigRequest, value: string | number | undefined) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createGig.mutateAsync(form);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Gigs</h1>
        <button onClick={() => setShowCreate(true)}>+ New Gig</button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          className={view !== "upcoming" ? "secondary" : undefined}
          aria-pressed={view === "upcoming"}
          onClick={() => setView("upcoming")}
        >
          Upcoming
        </button>
        <button
          className={view !== "past" ? "secondary" : undefined}
          aria-pressed={view === "past"}
          onClick={() => setView("past")}
        >
          Past
        </button>
        <button
          className={view !== "all" ? "secondary" : undefined}
          aria-pressed={view === "all"}
          onClick={() => setView("all")}
        >
          All
        </button>
      </div>

      <DataTable<Gig>
        columns={COLUMNS}
        data={displayedGigs}
        onRowClick={(g) => navigate(`/gigs/${g.id}`)}
        emptyMessage="No gigs found."
        filterPlaceholder="Search gigs…"
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Gig">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="First Name" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} required />
            <FormField label="Last Name" value={form.lastName ?? ""} onChange={(e) => setField("lastName", e.target.value)} />
            <FormField label="Partner Name" value={form.partnerName ?? ""} onChange={(e) => setField("partnerName", e.target.value)} />
            <FormField label="Email" type="email" value={form.email ?? ""} onChange={(e) => setField("email", e.target.value)} />
            <FormField label="Phone" type="tel" value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} />
            <FormField label="Date" type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required />
            <FormField label="Venue" value={form.venueName ?? ""} onChange={(e) => setField("venueName", e.target.value)} />
            <FormField label="Location" value={form.location ?? ""} onChange={(e) => setField("location", e.target.value)} />
            <FormField as="select" label="Status" value={form.status ?? "enquiry"} onChange={(e) => setField("status", e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </FormField>
          </div>
          <FormField as="textarea" label="Description" value={form.description ?? ""} onChange={(e) => setField("description", e.target.value)} rows={3} />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createGig.isPending} disabled={createGig.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={`${deleteTarget.firstName} ${deleteTarget.lastName ?? ""}`.trim()}
          onConfirm={async () => {
            await deleteGig.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteGig.isPending}
        />
      )}
    </main>
  );
}
