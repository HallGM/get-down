import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useServices, useCreateService } from "../../api/hooks/useServices.js";
import type { CreateServiceRequest, Service } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";

const COLUMNS: Column<Service>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "category", header: "Category", sortable: true, render: (s) => s.category ?? "—" },
  { key: "priceToClient", header: "Client Price", render: (s) => <MoneyDisplay pennies={s.priceToClient} /> },
  { key: "numberOfPeople", header: "No. Roles", render: (s) => s.numberOfPeople ?? "—" },
  { key: "isActive", header: "Active", render: (s) => s.isActive ? "✓" : "—" },
];

const EMPTY_FORM: CreateServiceRequest = { name: "", isActive: true };

export default function ServicesList() {
  const { data: services, isLoading, error } = useServices();
  const createService = useCreateService();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateServiceRequest>(EMPTY_FORM);

  function field<K extends keyof CreateServiceRequest>(k: K, v: CreateServiceRequest[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createService.mutateAsync(form);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Services</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to="/services/roles" className="secondary outline" style={{ padding: "0.4em 0.8em" }}>Manage roles →</Link>
          <button onClick={() => setShowCreate(true)}>+ New Service</button>
        </div>
      </div>

      <DataTable<Service>
        columns={[...COLUMNS, {
          key: "actions", header: "",
          render: (s) => (
            <button
              className="secondary outline"
              style={{ padding: "0.2em 0.5em" }}
              onClick={(e) => { e.stopPropagation(); navigate(`/services/${s.id}?edit=true`); }}
            >
              Edit
            </button>
          ),
        }]}
        data={services ?? []}
        emptyMessage="No services yet."
        onRowClick={(s) => navigate(`/services/${s.id}`)}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Service">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Name" value={form.name} onChange={(e) => field("name", e.target.value)} required />
            <FormField label="Category" value={form.category ?? ""} onChange={(e) => field("category", e.target.value)} />
            <FormField label="Price to Client (p)" type="number" value={form.priceToClient ?? ""} onChange={(e) => field("priceToClient", Number(e.target.value))} min={0} />
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createService.isPending} disabled={createService.isPending}>Create</button>
          </footer>
        </form>
      </Modal>
    </main>
  );
}
