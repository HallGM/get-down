import { useState, useEffect, useRef } from "react";
import { useCreateExpense } from "../api/hooks/useExpenses.js";
import { useSettleAllocationWithExpense } from "../api/hooks/useFeeAllocations.js";
import { useAccounts } from "../api/hooks/useAccounts.js";
import { useFileUpload } from "../hooks/useFileUpload.js";
import type { CreateExpenseRequest, Expense } from "@get-down/shared";
import Modal from "./Modal.js";
import FormField from "./FormField.js";
import MoneyField from "./MoneyField.js";
import { PaymentFormFields, EMPTY_PAYMENT_FORM, type PaymentFormState } from "./ExpensePaymentFormFields.js";
import { toInputDate } from "../utils/date.js";

// Extends the shared form state with dirty-tracking for auto-sync behaviour
interface LocalPaymentState extends PaymentFormState {
  amountDirty: boolean;
  dateDirty: boolean;
}

const EMPTY_LOCAL_PAYMENT: LocalPaymentState = {
  ...EMPTY_PAYMENT_FORM,
  amountDirty: false,
  dateDirty: false,
};

export interface ExpenseCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (expense: Expense) => void;
  initialValues?: { description?: string; amount?: number; recipientName?: string };
  allocationId?: number;
  /** If true, payment date defaults to today. If false, defaults to the expense date. */
  paymentDateIsToday?: boolean;
}

export default function ExpenseCreateModal({
  open,
  onClose,
  onCreated,
  initialValues,
  allocationId,
  paymentDateIsToday = false,
}: ExpenseCreateModalProps) {
  const createExpense = useCreateExpense();
  const settleAllocation = useSettleAllocationWithExpense();
  const { data: accounts = [] } = useAccounts();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUpload = useFileUpload();

  const [form, setForm] = useState<CreateExpenseRequest>(() => ({
    description: initialValues?.description ?? "",
    amount: initialValues?.amount ?? 0,
    recipientName: initialValues?.recipientName ?? "",
  }));
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<LocalPaymentState>(EMPTY_LOCAL_PAYMENT);

  // Reset everything whenever the modal opens
  useEffect(() => {
    if (open) {
      setForm({
        description: initialValues?.description ?? "",
        amount: initialValues?.amount ?? 0,
        recipientName: initialValues?.recipientName ?? "",
      });
      fileUpload.reset();
      setRecordPayment(false);
      setPaymentForm(EMPTY_LOCAL_PAYMENT);
      // Clear the file input's DOM value to remove any stale filename display
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep payment amount/date in sync with expense (unless user has edited them)
  useEffect(() => {
    if (recordPayment) {
      setPaymentForm((f) => ({
        ...f,
        amount: f.amountDirty ? f.amount : form.amount,
        date:   f.dateDirty   ? f.date   : (form.date ?? ""),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.amount, form.date]);

  function handleRecordPaymentToggle(checked: boolean) {
    setRecordPayment(checked);
    if (checked) {
      const businessAccount = accounts.find((a) => a.isBusiness);
      setPaymentForm({
        accountId: businessAccount?.id ?? "",
        amount: form.amount,
        date: paymentDateIsToday ? toInputDate(new Date()) : (form.date || toInputDate(new Date())),
        paymentMethod: "Transfer",
        description: "",
        amountDirty: false,
        dateDirty: true,
      });
    }
  }

  // Wrapper setter for PaymentFormFields — tracks which fields the user has edited
  function setPaymentFormFields(fn: (f: PaymentFormState) => PaymentFormState) {
    setPaymentForm((f) => {
      const { amountDirty, dateDirty, ...base } = f;
      const next = fn(base);
      return {
        ...next,
        amountDirty: amountDirty || next.amount !== base.amount,
        dateDirty:   dateDirty   || next.date   !== base.date,
      };
    });
  }

  function handleClose() {
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fileUpload.error) return;

    const input: CreateExpenseRequest = { ...form };
    if (recordPayment && typeof paymentForm.accountId === "number") {
      input.payment = {
        accountId:     paymentForm.accountId,
        amount:        paymentForm.amount,
        date:          paymentForm.date || undefined,
        paymentMethod: paymentForm.paymentMethod || undefined,
        description:   paymentForm.description   || undefined,
      };
    }

    const created = allocationId
      ? await settleAllocation.mutateAsync({ allocationId, input, file: fileUpload.file })
      : await createExpense.mutateAsync({ input, file: fileUpload.file });
    onCreated?.(created);
  }

  const isLoading = createExpense.isPending || settleAllocation.isPending;
  const paymentMissing = recordPayment && (paymentForm.accountId === "" || paymentForm.amount === 0);


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
           <div style={{ gridColumn: "1 / -1" }}>
             <label>
               <small>Invoice document (optional, max 20 MB)</small>
               <input
                 ref={fileInputRef}
                 type="file"
                 onChange={fileUpload.handleFileChange}
                 style={{ marginTop: "0.25rem" }}
               />
             </label>
             {fileUpload.error && <small style={{ color: "var(--pico-color-red-500)" }}>{fileUpload.error}</small>}
           </div>

          {/* Record payment toggle */}
          <div style={{ gridColumn: "1 / -1", marginTop: "0.25rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={recordPayment}
                onChange={(e) => handleRecordPaymentToggle(e.target.checked)}
                style={{ margin: 0 }}
              />
              <span>Record payment now</span>
            </label>
          </div>

          {/* Inline payment fields */}
          {recordPayment && (
            <div style={{ gridColumn: "1 / -1" }}>
              <PaymentFormFields
                form={paymentForm}
                setForm={setPaymentFormFields}
                accounts={accounts}
              />
            </div>
          )}
        </div>

        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={handleClose}>Cancel</button>
          <button
            type="submit"
            aria-busy={isLoading}
            disabled={isLoading || !!fileUpload.error || paymentMissing}
          >
            {allocationId ? "Settle" : "Create"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
