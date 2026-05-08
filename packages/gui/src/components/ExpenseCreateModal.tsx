import { useState, useEffect } from "react";
import { useCreateExpense } from "../api/hooks/useExpenses.js";
import type { CreateExpenseRequest, Expense } from "@get-down/shared";
import { MAX_DOCUMENT_SIZE_BYTES } from "@get-down/shared";
import Modal from "./Modal.js";
import FormField from "./FormField.js";
import MoneyField from "./MoneyField.js";
import { toInputDate } from "../utils/date.js";

function makeFileChangeHandler(
  setFile: (f: File | undefined) => void,
  setError: (e: string | undefined) => void,
) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setFile(undefined); setError(undefined); return; }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setFile(undefined);
      setError("File must be 20 MB or smaller.");
      e.target.value = "";
      return;
    }
    setError(undefined);
    setFile(file);
  };
}

export interface ExpenseCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (expense: Expense) => void;
  initialValues?: { description?: string; amount?: number };
}

export default function ExpenseCreateModal({
  open,
  onClose,
  onCreated,
  initialValues,
}: ExpenseCreateModalProps) {
  const createExpense = useCreateExpense();

  const [form, setForm] = useState<CreateExpenseRequest>(() => ({
    description: initialValues?.description ?? "",
    amount: initialValues?.amount ?? 0,
  }));
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [fileError, setFileError] = useState<string | undefined>(undefined);

  const handleFileChange = makeFileChangeHandler(setSelectedFile, setFileError);

  // Reset form whenever the modal opens so pre-filled values stay current
  useEffect(() => {
    if (open) {
      setForm({
        description: initialValues?.description ?? "",
        amount: initialValues?.amount ?? 0,
      });
      setSelectedFile(undefined);
      setFileError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fileError) return;
    const created = await createExpense.mutateAsync({ input: form, file: selectedFile });
    onCreated?.(created);
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Expense">
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <FormField
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
          />
          <MoneyField
            label="Amount"
            value={form.amount}
            onChange={(pennies) => setForm((f) => ({ ...f, amount: pennies ?? 0 }))}
            required
            min={0}
          />
          <FormField
            label="Date"
            type="date"
            value={toInputDate(form.date)}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <FormField
            label="Category"
            value={form.category ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <FormField
            label="Recipient"
            value={form.recipientName ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
          />
          <FormField
            label="Payment Method"
            value={form.paymentMethod ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <label>
              <small>Invoice document (optional, max 20 MB)</small>
              <input type="file" onChange={handleFileChange} style={{ marginTop: "0.25rem" }} />
            </label>
            {fileError && <small style={{ color: "var(--pico-color-red-500)" }}>{fileError}</small>}
          </div>
        </div>
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={handleClose}>Cancel</button>
          <button
            type="submit"
            aria-busy={createExpense.isPending}
            disabled={createExpense.isPending || !!fileError}
          >
            Create
          </button>
        </footer>
      </form>
    </Modal>
  );
}
