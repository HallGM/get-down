import { type ReactNode, useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  // Tracks whether a native file picker was just opened from within this
  // modal. Some browsers fire a spurious "cancel" event on the parent
  // <dialog> when the native file picker is dismissed (e.g. via Escape),
  // which would otherwise close the whole modal. We suppress that here.
  const filePickerActiveRef = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Detect clicks on file inputs to know a native file picker is about to open
  function handleMouseDown(e: React.MouseEvent<HTMLDialogElement>) {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLInputElement && target.type === "file") {
      filePickerActiveRef.current = true;
      const onWindowFocus = () => {
        // The native picker closes just before the window regains focus.
        // Wait briefly before clearing the flag so a spurious "cancel"
        // event (which fires around the same time) is still suppressed.
        setTimeout(() => {
          filePickerActiveRef.current = false;
        }, 300);
      };
      window.addEventListener("focus", onWindowFocus, { once: true });
    }
  }

  // Close on backdrop click
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (rect && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) {
      onClose();
    }
  }

  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    if (filePickerActiveRef.current) {
      e.preventDefault();
      filePickerActiveRef.current = false;
      return;
    }
    onClose();
  }

  return (
    <dialog ref={ref} onClick={handleClick} onMouseDown={handleMouseDown} onCancel={handleCancel}>
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
