import { useState, useEffect } from "react";
import { useCreateTransaction } from "../api/hooks/useAccounts.js";
import type { AccountTransaction } from "@get-down/shared";
import Modal from "./Modal.js";
import ModalFooter from "./ModalFooter.js";
import TransactionFormFields, { type TransactionFormState } from "./TransactionFormFields.js";

export interface TransactionCreateModalProps {
  open: boolean;
  onClose: () => void;
  accountId: number;
  initialValues?: { description?: string; amount?: number };
  onCreated?: (transaction: AccountTransaction) => void;
}

function makeInitialForm(initialValues?: { description?: string; amount?: number }): TransactionFormState {
  return {
    date: "",
    amount: initialValues?.amount ?? 0,
    type: "Drawing",
    description: initialValues?.description ?? "",
  };
}

export default function TransactionCreateModal({
  open,
  onClose,
  accountId,
  initialValues,
  onCreated,
}: TransactionCreateModalProps) {
  const createTransaction = useCreateTransaction(accountId);

  const [form, setForm] = useState<TransactionFormState>(() => makeInitialForm(initialValues));

  // Reset form whenever the modal opens so pre-filled values stay current.
  useEffect(() => {
    if (open) setForm(makeInitialForm(initialValues));
  }, [open, initialValues?.amount, initialValues?.description]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const created = await createTransaction.mutateAsync({
      date: form.date,
      amount: form.amount,
      type: form.type,
      description: form.description || undefined,
      feeAllocationIds: [],
    });
    onCreated?.(created);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Transaction">
      <form onSubmit={handleSubmit}>
        <TransactionFormFields form={form} setForm={setForm} dateRequired />
        <ModalFooter>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            aria-busy={createTransaction.isPending}
            disabled={createTransaction.isPending}
          >
            Create
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
