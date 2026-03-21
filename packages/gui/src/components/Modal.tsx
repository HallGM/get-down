import { type ReactNode, useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Close on backdrop click
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (rect && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) {
      onClose();
    }
  }

  return (
    <dialog ref={ref} onClick={handleClick} onCancel={onClose}>
      <article>
        <header>
          <button
            aria-label="Close"
            rel="prev"
            onClick={onClose}
            className="close"
          />
          <strong>{title}</strong>
        </header>
        {children}
      </article>
    </dialog>
  );
}
