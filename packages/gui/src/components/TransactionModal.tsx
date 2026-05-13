import { useState, useEffect } from "react";
import { useUpdateTransaction } from "../api/hooks/useAccounts.js";
import type { AccountTransaction } from "@get-down/shared";
import Modal from "./Modal.js";
import TransactionFormFields, { type TransactionFormState } from "./TransactionFormFields.js";
import { toInputDate } from "../utils/date.js";

interface Props {
  /** The transaction to edit. When null the modal is closed. */
  transaction: AccountTransaction | null;
  accountId: number;
  onClose: () => void;
}

export default function TransactionModal({ transaction, accountId, onClose }: Props) {
  const updateTransaction = useUpdateTransaction(accountId);

  const [form, setForm] = useState<TransactionFormState>({
    date: "",
    amount: 0,
    type: "Drawing",
    description: "",
  });

  // Seed form when the target transaction changes.
  useEffect(() => {
    if (!transaction) return;
    setForm({
      date: toInputDate(transaction.date),
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description ?? "",
    });
  }, [transaction?.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction) return;
    await updateTransaction.mutateAsync({
      id: transaction.id,
      input: {
        date: form.date || undefined,
        amount: form.amount,
        type: form.type,
        description: form.description || undefined,
        feeAllocationIds: transaction.feeAllocationIds,
      },
    });
    onClose();
  }

  return (
    <Modal open={!!transaction} onClose={onClose} title="Edit Transaction">
      <form onSubmit={handleSave}>
        <TransactionFormFields form={form} setForm={setForm} />
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            aria-busy={updateTransaction.isPending}
            disabled={updateTransaction.isPending}
          >
            Save
          </button>
        </footer>
      </form>
    </Modal>
  );
}
