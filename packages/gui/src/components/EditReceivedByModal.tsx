import { useState, useEffect } from "react";
import Modal from "./Modal.js";
import PartnerAccountSelect from "./PartnerAccountSelect.js";

export interface EditReceivedByModalProps {
  open: boolean;
  receivedByAccountId: number | null;
  accounts: { id: number; personName: string }[];
  onSave: (accountId: number | null) => Promise<void>;
  onClose: () => void;
  isPending: boolean;
}

export default function EditReceivedByModal({ open, receivedByAccountId, accounts, onSave, onClose, isPending }: EditReceivedByModalProps) {
  const [value, setValue] = useState<number | null>(receivedByAccountId);

  // Sync when the modal opens for a different payment
  useEffect(() => { setValue(receivedByAccountId); }, [receivedByAccountId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(value);
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Received By">
      <form onSubmit={handleSubmit}>
        <PartnerAccountSelect
          value={value}
          accounts={accounts}
          onChange={setValue}
        />
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" aria-busy={isPending} disabled={isPending}>Save</button>
        </footer>
      </form>
    </Modal>
  );
}
