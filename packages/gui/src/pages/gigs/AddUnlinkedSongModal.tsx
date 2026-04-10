import { useState, useEffect } from "react";
import type { SetListItemWithSong } from "@get-down/shared";
import Modal from "../../components/Modal.js";
import FormField from "../../components/FormField.js";

interface UnlinkedSongForm {
  unlinkedTitle: string;
  unlinkedArtist: string;
  unlinkedKey: string;
  unlinkedVocalType: string;
}

const EMPTY: UnlinkedSongForm = {
  unlinkedTitle: "",
  unlinkedArtist: "",
  unlinkedKey: "",
  unlinkedVocalType: "",
};

interface Props {
  open: boolean;
  /** If provided, the modal is in edit mode; otherwise create mode */
  editItem?: SetListItemWithSong | null;
  onClose: () => void;
  onSubmit: (form: UnlinkedSongForm) => Promise<void>;
  isPending: boolean;
}

export default function AddUnlinkedSongModal({ open, editItem, onClose, onSubmit, isPending }: Props) {
  const isEdit = !!editItem;
  const [form, setForm] = useState<UnlinkedSongForm>(EMPTY);

  // Populate form when entering edit mode
  useEffect(() => {
    if (editItem) {
      setForm({
        unlinkedTitle: editItem.unlinkedTitle ?? editItem.title ?? "",
        unlinkedArtist: editItem.unlinkedArtist ?? editItem.artist ?? "",
        unlinkedKey: editItem.unlinkedKey ?? "",
        unlinkedVocalType: editItem.unlinkedVocalType ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [editItem, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
    setForm(EMPTY);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Song" : "Add Unlisted Song"}
    >
      <form onSubmit={handleSubmit}>
        <FormField
          label="Title"
          value={form.unlinkedTitle}
          onChange={e => setForm(f => ({ ...f, unlinkedTitle: e.target.value }))}
          required
          placeholder="Song title"
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <FormField
            label="Artist"
            value={form.unlinkedArtist}
            onChange={e => setForm(f => ({ ...f, unlinkedArtist: e.target.value }))}
            placeholder="Artist name"
          />
          <FormField
            label="Key"
            value={form.unlinkedKey}
            onChange={e => setForm(f => ({ ...f, unlinkedKey: e.target.value }))}
            placeholder="e.g. G"
          />
          <FormField
            label="Vocal Type"
            as="select"
            value={form.unlinkedVocalType}
            onChange={e => setForm(f => ({ ...f, unlinkedVocalType: e.target.value }))}
          >
            <option value="">— select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Both">Both</option>
          </FormField>
        </div>
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" aria-busy={isPending} disabled={isPending}>
            {isEdit ? "Save" : "Add to Set List"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
