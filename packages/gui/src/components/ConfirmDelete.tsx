import Modal from "./Modal.js";

interface Props {
  open: boolean;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDelete({ open, itemName, onConfirm, onCancel, loading }: Props) {
  return (
    <Modal open={open} onClose={onCancel} title="Confirm Delete">
      <p>
        Are you sure you want to delete <strong>{itemName}</strong>? This cannot be undone.
      </p>
      <footer>
        <button className="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button className="contrast" onClick={onConfirm} aria-busy={loading}>
          Delete
        </button>
      </footer>
    </Modal>
  );
}
