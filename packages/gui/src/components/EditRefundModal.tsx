import { useState, useEffect } from "react";
import type { Refund, UpdateRefundRequest } from "@get-down/shared";
import Modal from "./Modal.js";
import ModalFooter from "./ModalFooter.js";
import PaymentRefundFormFields, { type PaymentRefundFormState } from "./PaymentRefundFormFields.js";
import { toInputDate } from "../utils/date.js";

interface Props {
  open: boolean;
  refund: Refund | null;
  onSave: (input: UpdateRefundRequest) => Promise<void>;
  onClose: () => void;
  isPending: boolean;
}

export default function EditRefundModal({ open, refund, onSave, onClose, isPending }: Props) {
  const [form, setForm] = useState<PaymentRefundFormState>(emptyForm());

  useEffect(() => {
    if (!refund) return;
    setForm({
      amount: refund.amount,
      date: toInputDate(refund.date),
      method: refund.method ?? "",
      description: refund.description ?? "",
    });
  }, [refund?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!refund) return;
    await onSave({
      gigId: refund.gigId,
      amount: form.amount,
      date: form.date || undefined,
      method: form.method.trim() || undefined,
      description: form.description.trim() || undefined,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Refund">
      <form onSubmit={handleSubmit}>
        <PaymentRefundFormFields form={form} setForm={setForm} />
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
  return { amount: 0, date: "", method: "", description: "" };
}
