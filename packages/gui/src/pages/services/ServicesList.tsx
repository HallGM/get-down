import { useState } from "react";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "../../api/hooks/useServices.js";
import type { CreateServiceRequest, UpdateServiceRequest, Service } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";

const COLUMNS: Column<Service>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "category", header: "Category", sortable: true, render: (s) => s.category ?? "—" },
  { key: "priceToClient", header: "Client Price", render: (s) => <MoneyDisplay pennies={s.priceToClient} /> },
  { key: "feePerPerson", header: "Fee/Person", render: (s) => <MoneyDisplay pennies={s.feePerPerson} /> },
  { key: "numberOfPeople", header: "No. People", render: (s) => s.numberOfPeople ?? "—" },
  { key: "isActive", header: "Active", render: (s) => s.isActive ? "✓" : "—" },
];

const EMPTY_FORM: CreateServiceRequest = { name: "", isActive: true };

export default function ServicesList() {
  const { data: services, isLoading, error } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateServiceRequest>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [editForm, setEditForm] = useState<UpdateServiceRequest>({});
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  function field<K extends keyof CreateServiceRequest>(k: K, v: CreateServiceRequest[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createService.mutateAsync(form);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    await updateService.mutateAsync({ id: editTarget.id, input: editForm });
    setEditTarget(null);
  }

  function openEdit(s: Service) {
    setEditTarget(s);
    setEditForm({ name: s.name, category: s.category, description: s.description, priceToClient: s.priceToClient, feePerPerson: s.feePerPerson, numberOfPeople: s.numberOfPeople, extraFee: s.extraFee, extraFeeDescription: s.extraFeeDescription, isActive: s.isActive });
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Services</h1>
        <button onClick={() => setShowCreate(true)}>+ New Service</button>
      </div>

      <DataTable<Service>
        columns={[...COLUMNS, {
          key: "actions", header: "",
          render: (s) => <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={(e) => { e.stopPropagation(); openEdit(s); }}>Edit</button>,
        }]}
        data={services ?? []}
        emptyMessage="No services yet."
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Service">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Name" value={form.name} onChange={(e) => field("name", e.target.value)} required />
            <FormField label="Category" value={form.category ?? ""} onChange={(e) => field("category", e.target.value)} />
            <FormField label="Price to Client (p)" type="number" value={form.priceToClient ?? ""} onChange={(e) => field("priceToClient", Number(e.target.value))} min={0} />
            <FormField label="Fee per Person (p)" type="number" value={form.feePerPerson ?? ""} onChange={(e) => field("feePerPerson", Number(e.target.value))} min={0} />
            <FormField label="Number of People" type="number" value={form.numberOfPeople ?? ""} onChange={(e) => field("numberOfPeople", Number(e.target.value))} min={0} />
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createService.isPending} disabled={createService.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Service">
        <form onSubmit={handleUpdate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Name" value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
            <FormField label="Category" value={editForm.category ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} />
            <FormField label="Price to Client (p)" type="number" value={editForm.priceToClient ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, priceToClient: Number(e.target.value) }))} min={0} />
            <FormField label="Fee per Person (p)" type="number" value={editForm.feePerPerson ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, feePerPerson: Number(e.target.value) }))} min={0} />
            <FormField label="Number of People" type="number" value={editForm.numberOfPeople ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, numberOfPeople: Number(e.target.value) }))} min={0} />
          </div>
          <label><input type="checkbox" checked={!!editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} /> Active</label>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="contrast outline" onClick={() => { setDeleteTarget(editTarget); setEditTarget(null); }}>Delete</button>
            <button type="button" className="secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" aria-busy={updateService.isPending} disabled={updateService.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={deleteTarget.name}
          onConfirm={async () => { await deleteService.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteService.isPending}
        />
      )}
    </main>
  );
}
