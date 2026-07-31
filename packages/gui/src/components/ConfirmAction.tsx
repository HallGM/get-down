import { type ReactNode } from "react";
import Modal from "./Modal.js";

interface Props {
  open: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  confirmLabel?: string;
  confirmClassName?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmAction({
  open,
  title,
  message,
  children,
  confirmLabel = "Confirm",
  confirmClassName = "primary",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {children || (message && <p>{message}</p>)}
      <footer>
        <button className="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </button>
        <button className={confirmClassName} onClick={onConfirm} aria-busy={loading} disabled={loading}>
          {confirmLabel}
        </button>
      </footer>
    </Modal>
  );
}
