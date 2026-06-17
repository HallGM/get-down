import { useState, useEffect } from "react";
import type { Payment, UpdatePaymentRequest } from "@get-down/shared";
import Modal from "./Modal.js";
import ModalFooter from "./ModalFooter.js";
import PaymentRefundFormFields, { type PaymentRefundFormState } from "./PaymentRefundFormFields.js";
import { toInputDate } from "../utils/date.js";

interface Props {
  open: boolean;
  payment: Payment | null;
  accounts: { id: number; personName: string }[];
  onSave: (input: UpdatePaymentRequest) => Promise<void>;
  onClose: () => void;
  isPending: boolean;
}

export default function EditPaymentModal({ open, payment, accounts, onSave, onClose, isPending }: Props) {
  const [form, setForm] = useState<PaymentRefundFormState>(emptyForm());

  useEffect(() => {
    if (!payment) return;
    setForm({
      amount: payment.amount,
      date: toInputDate(payment.date),
      method: payment.method ?? "",
      description: payment.description ?? "",
      receivedByAccountId: payment.receivedByAccountId ?? null,
    });
  }, [payment?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payment) return;
    await onSave({
      gigId: payment.gigId,
      amount: form.amount,
      date: form.date || undefined,
      method: form.method.trim() || undefined,
      description: form.description.trim() || undefined,
      receivedByAccountId: form.receivedByAccountId,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Payment">
      <form onSubmit={handleSubmit}>
        <PaymentRefundFormFields form={form} setForm={setForm} accounts={accounts} />
        <ModalFooter>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" aria-busy={isPending} disabled={isPending}>Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function emptyForm(): PaymentRefundFormState {
  return { amount: 0, date: "", method: "", description: "", receivedByAccountId: null };
}
