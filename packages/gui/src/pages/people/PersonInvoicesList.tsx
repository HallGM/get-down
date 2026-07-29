import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePersonInvoices, useCreatePersonInvoice, useUpdatePersonInvoice, useDeletePersonInvoice, useGeneratePersonInvoicePdf } from "../../api/hooks/usePersonInvoices.js";
import { usePeople } from "../../api/hooks/usePeople.js";
import type { PersonInvoice, CreatePersonInvoiceRequest, UpdatePersonInvoiceRequest } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LineItemEditor from "../../components/LineItemEditor.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import { useToast } from "../../components/Toast.js";
import { formatDate } from "../../utils/date.js";

const COLUMNS: Column<PersonInvoice>[] = [
  { key: "invoiceNumber", header: "Invoice Number", sortable: true },
  { key: "date", header: "Date", sortable: true, render: (pi) => formatDate(pi.date) },
  { key: "totalAmount", header: "Total", render: (pi) => `£${(pi.totalAmount / 100).toFixed(2)}` },
];

const EMPTY_FORM: CreatePersonInvoiceRequest = {
  personId: 0,
  date: new Date().toISOString().split("T")[0],
  lineItems: [{ description: "", amount: 0 }],
};

function filterPersonInvoice(invoice: PersonInvoice, query: string): boolean {
  return invoice.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
    invoice.date.toLowerCase().includes(query.toLowerCase());
}

export default function PersonInvoicesList() {
  const { personId: personIdStr } = useParams<{ personId: string }>();
  const personId = personIdStr ? parseInt(personIdStr, 10) : 0;
  const navigate = useNavigate();
  const { data: people } = usePeople();
  const { data: invoices, isLoading, error } = usePersonInvoices(personId);
  const createPersonInvoice = useCreatePersonInvoice();
  const updatePersonInvoice = useUpdatePersonInvoice();
  const deletePersonInvoice = useDeletePersonInvoice();
  const generatePdf = useGeneratePersonInvoicePdf();
  const { showToast } = useToast();
  const [pdfBusyIds, setPdfBusyIds] = useState<Set<number>>(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreatePersonInvoiceRequest>({
    ...EMPTY_FORM,
    personId,
  });
  const [editTarget, setEditTarget] = useState<PersonInvoice | null>(null);
  const [editForm, setEditForm] = useState<UpdatePersonInvoiceRequest>({});
  const [deleteTarget, setDeleteTarget] = useState<PersonInvoice | null>(null);

  const person = people?.find((p) => p.id === personId);

  // Sync edit form when edit target changes
  useEffect(() => {
    if (editTarget) {
      setEditForm({
        date: editTarget.date,
        lineItems: editTarget.lineItems || [],
      });
    }
  }, [editTarget?.id]); // Only depend on ID to avoid unnecessary updates

  function setField<K extends keyof CreatePersonInvoiceRequest>(field: K, value: CreatePersonInvoiceRequest[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setLineItem(index: number, field: "description" | "amount", value: string | number | undefined) {
    setForm((f) => {
      const items = [...(f.lineItems || [])];
      if (field === "description") {
        items[index] = { ...items[index], [field]: value as string };
      } else {
        items[index] = { ...items[index], [field]: value ?? 0 };
      }
      return { ...f, lineItems: items };
    });
  }

  function addLineItem() {
    setForm((f) => ({
      ...f,
      lineItems: [...(f.lineItems || []), { description: "", amount: 0 }],
    }));
  }

  function removeLineItem(index: number) {
    setForm((f) => ({
      ...f,
      lineItems: (f.lineItems || []).filter((_, i) => i !== index),
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.lineItems || form.lineItems.length === 0) {
      showToast("Add at least one line item", "error");
      return;
    }
    await createPersonInvoice.mutateAsync(form);
    setShowCreate(false);
    setForm({ ...EMPTY_FORM, personId });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm.lineItems || editForm.lineItems.length === 0) {
      showToast("Add at least one line item", "error");
      return;
    }
    await updatePersonInvoice.mutateAsync({ id: editTarget.id, personId, input: editForm });
    setEditTarget(null);
    setEditForm({});
  }

  function openEdit(invoice: PersonInvoice) {
    setEditTarget(invoice);
  }

  async function handleGeneratePdf(invoice: PersonInvoice) {
    setPdfBusyIds((prev) => new Set(prev).add(invoice.id));
    try {
      await generatePdf.mutateAsync({ id: invoice.id, filename: `${invoice.invoiceNumber}.pdf` });
    } finally {
      setPdfBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(invoice.id);
        return next;
      });
    }
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <button className="secondary" style={{ marginBottom: "1rem" }} onClick={() => navigate("/people")}>← Back to People</button>
          <h1>Invoices for {person?.displayName || person?.firstName}</h1>
        </div>
        <button onClick={() => setShowCreate(true)}>+ New Invoice</button>
      </div>

      <DataTable<PersonInvoice>
        columns={[...COLUMNS, {
          key: "actions",
          header: "",
          render: (pi) => (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={(e) => { e.stopPropagation(); void handleGeneratePdf(pi); }} aria-busy={pdfBusyIds.has(pi.id)}>PDF</button>
              <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={(e) => { e.stopPropagation(); openEdit(pi); }}>Edit</button>
              <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={(e) => { e.stopPropagation(); setDeleteTarget(pi); }}>Delete</button>
            </div>
          ),
        }]}
        data={invoices ?? []}
        emptyMessage="No invoices yet."
        filterPlaceholder="Search invoices…"
        filterFn={filterPersonInvoice}
      />

      {/* Create */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Person Invoice">
        <form onSubmit={handleCreate}>
          <FormField label="Date" type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required />
          <LineItemEditor
            lineItems={form.lineItems || []}
            onLineItemChange={setLineItem}
            onAddLineItem={addLineItem}
            onRemoveLineItem={removeLineItem}
          />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createPersonInvoice.isPending} disabled={createPersonInvoice.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={!!editTarget} onClose={() => { setEditTarget(null); setEditForm({}); }} title="Edit Person Invoice">
        <form onSubmit={handleUpdate}>
          <FormField 
            label="Date" 
            type="date" 
            value={editForm.date || ""} 
            onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} 
            required 
          />
          <LineItemEditor
            lineItems={editForm.lineItems || []}
            onLineItemChange={(index, field, value) => {
              setEditForm((f) => {
                const items = [...(f.lineItems || [])];
                if (field === "description") {
                  items[index] = { ...items[index], [field]: value as string };
                } else {
                  items[index] = { ...items[index], [field]: value ?? 0 };
                }
                return { ...f, lineItems: items };
              });
            }}
            onAddLineItem={() => {
              setEditForm((f) => ({
                ...f,
                lineItems: [...(f.lineItems || []), { description: "", amount: 0 }],
              }));
            }}
            onRemoveLineItem={(index) => {
              setEditForm((f) => ({
                ...f,
                lineItems: (f.lineItems || []).filter((_, i) => i !== index),
              }));
            }}
          />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button type="button" className="contrast outline" onClick={() => { setDeleteTarget(editTarget); setEditTarget(null); }}>Delete</button>
            <button type="button" className="secondary" onClick={() => { setEditTarget(null); setEditForm({}); }}>Cancel</button>
            <button type="submit" aria-busy={updatePersonInvoice.isPending} disabled={updatePersonInvoice.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={deleteTarget.invoiceNumber}
          onConfirm={async () => { await deletePersonInvoice.mutateAsync({ id: deleteTarget.id, personId }); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
          loading={deletePersonInvoice.isPending}
        />
      )}
    </main>
  );
}
