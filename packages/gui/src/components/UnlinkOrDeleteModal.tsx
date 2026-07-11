import Modal from "./Modal.js";

interface UnlinkOrDeleteModalProps {
  open: boolean;
  itemLabel: string;
  onClose: () => void;
  onRemoveLink: () => void;
  onDelete: () => void;
  deletePending?: boolean;
  unlinkPending?: boolean;
}

export function UnlinkOrDeleteModal({
  open,
  itemLabel,
  onClose,
  onRemoveLink,
  onDelete,
  deletePending,
  unlinkPending,
}: UnlinkOrDeleteModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Remove linked item"
    >
      <p>
        Do you want to delete <strong>{itemLabel}</strong> entirely,
        or just remove the link?
      </p>
      <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="secondary outline"
          disabled={unlinkPending}
          aria-busy={unlinkPending}
          onClick={onRemoveLink}
        >
          Remove link only
        </button>
        <button
          type="button"
          className="contrast"
          aria-busy={deletePending}
          disabled={deletePending}
          onClick={onDelete}
        >
          Delete item
        </button>
      </footer>
    </Modal>
  );
}
