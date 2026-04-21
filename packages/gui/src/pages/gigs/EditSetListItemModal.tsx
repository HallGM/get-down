import { useState, useEffect } from "react";
import type { SetListItemWithSong } from "@get-down/shared";
import Modal from "../../components/Modal.js";
import FormField from "../../components/FormField.js";

export interface EditSetListItemSubmit {
  title: string;
  artist: string;
  key: string;
  vocalType: string;
  durationMinutes: string;
  durationSeconds: string;
}

interface FormState {
  title: string;
  artist: string;
  key: string;
  vocalType: string;
  durationMinutes: string;
  durationSeconds: string;
}

const EMPTY: FormState = {
  title: "",
  artist: "",
  key: "",
  vocalType: "",
  durationMinutes: "",
  durationSeconds: "",
};

interface Props {
  open: boolean;
  /** The item being edited. Omit or pass null for "add unlisted song" create mode. */
  item?: SetListItemWithSong | null;
  /** When true: title/artist are disabled and a set-list-only warning is shown. */
  isLinked?: boolean;
  /** Modal heading. Defaults to "Edit song" (linked/unlinked edit) or "Add unlisted song" (create). */
  modalTitle?: string;
  onClose: () => void;
  onSubmit: (form: EditSetListItemSubmit) => Promise<void>;
  isPending: boolean;
}

export default function EditSetListItemModal({
  open,
  item,
  isLinked = false,
  modalTitle,
  onClose,
  onSubmit,
  isPending,
}: Props) {
  const isCreate = !item;
  const title = modalTitle ?? (isCreate ? "Add unlisted song" : "Edit song");

  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (item) {
      const durSeconds = isLinked
        ? (item.overrideDuration ?? item.duration)
        : (item.unlinkedDuration ?? item.duration);
      const mins = durSeconds !== undefined ? Math.floor(durSeconds / 60) : undefined;
      const secs = durSeconds !== undefined ? durSeconds % 60 : undefined;
      setForm({
        title: (isLinked ? item.title : (item.unlinkedTitle ?? item.title)) ?? "",
        artist: (isLinked ? item.artist : (item.unlinkedArtist ?? item.artist)) ?? "",
        key: (isLinked
          ? (item.overrideKey ?? item.musicalKey)
          : (item.unlinkedKey ?? item.musicalKey)) ?? "",
        vocalType: (isLinked
          ? (item.overrideVocalType ?? item.vocalType)
          : (item.unlinkedVocalType ?? item.vocalType)) ?? "",
        durationMinutes: mins !== undefined ? String(mins) : "",
        durationSeconds: secs !== undefined ? String(secs) : "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [item, open, isLinked]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ ...form });
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <FormField
            label="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required={!isLinked}
            placeholder="Song title"
            disabled={isLinked}
          />
          <FormField
            label="Artist"
            value={form.artist}
            onChange={e => setForm(f => ({ ...f, artist: e.target.value }))}
            placeholder="Artist name"
            disabled={isLinked}
          />
          <FormField
            label="Key"
            value={form.key}
            onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
            placeholder="e.g. G"
          />
          <FormField
            label="Vocal Type"
            value={form.vocalType}
            onChange={e => setForm(f => ({ ...f, vocalType: e.target.value }))}
            placeholder="e.g. M, F, Both"
          />
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
              Duration <small style={{ color: "var(--pico-muted-color)", fontWeight: 400 }}>(optional)</small>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input
                type="number"
                min="0"
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
                placeholder="0"
                aria-label="Duration minutes"
                style={{ width: "4rem", margin: 0 }}
              />
              <span style={{ color: "var(--pico-muted-color)" }}>m</span>
              <input
                type="number"
                min="0"
                max="59"
                value={form.durationSeconds}
                onChange={e => setForm(f => ({ ...f, durationSeconds: e.target.value }))}
                placeholder="00"
                aria-label="Duration seconds"
                style={{ width: "4rem", margin: 0 }}
              />
              <span style={{ color: "var(--pico-muted-color)" }}>s</span>
            </div>
          </div>
        </div>

        {isLinked && (
          <p style={{ marginTop: "1rem", marginBottom: 0, fontSize: "0.85rem", color: "var(--pico-muted-color)" }}>
            ℹ These changes apply to this set list only and won't affect the song catalogue.
          </p>
        )}

        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" aria-busy={isPending} disabled={isPending}>
            {isCreate ? "Add to Set List" : "Save"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
