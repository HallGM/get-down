import ConfirmAction from "./ConfirmAction.js";

interface Props {
  open: boolean;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDelete({ open, itemName, onConfirm, onCancel, loading }: Props) {
  return (
    <ConfirmAction
      open={open}
      title="Confirm Delete"
      confirmLabel="Delete"
      confirmClassName="contrast"
      onConfirm={onConfirm}
      onCancel={onCancel}
      loading={loading}
    >
      <p>
        Are you sure you want to delete <strong>{itemName}</strong>? This cannot be undone.
      </p>
    </ConfirmAction>
  );
}

