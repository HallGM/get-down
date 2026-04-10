import { useState } from "react";
import { useSongs, useCreateSong, useUpdateSong, useDeleteSong } from "../../api/hooks/useSongs.js";
import { useHousePlaylist, useAddToHousePlaylist, useRemoveFromHousePlaylist } from "../../api/hooks/useHousePlaylist.js";
import type { CreateSongRequest, UpdateSongRequest, Song } from "@get-down/shared";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";

const COLUMNS: Column<Song>[] = [
  { key: "title", header: "Title", sortable: true },
  { key: "artist", header: "Artist", sortable: true, render: (s) => s.artist ?? "—" },
  { key: "genre", header: "Genre", sortable: true, render: (s) => s.genre ?? "—" },
  { key: "musicalKey", header: "Key", render: (s) => s.musicalKey ?? "—" },
  { key: "bpm", header: "BPM", render: (s) => s.bpm ?? "—" },
  { key: "vocalType", header: "Vocal", sortable: true, render: (s) => s.vocalType ?? "—" },
];
const EMPTY_FORM: CreateSongRequest = { title: "" };

export default function SongsList() {
  const { data: songs, isLoading, error } = useSongs();
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();
  const { data: housePlaylist = [] } = useHousePlaylist();
  const addToHouse = useAddToHousePlaylist();
  const removeFromHouse = useRemoveFromHousePlaylist();

  const houseIds = new Set(housePlaylist.map(h => h.songId));

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateSongRequest>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Song | null>(null);
  const [editForm, setEditForm] = useState<UpdateSongRequest>({});
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createSong.mutateAsync(form);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    await updateSong.mutateAsync({ id: editTarget.id, input: editForm });
    setEditTarget(null);
  }

  function openEdit(s: Song) {
    setEditTarget(s);
    setEditForm({ title: s.title, artist: s.artist, genre: s.genre, musicalKey: s.musicalKey, bpm: s.bpm, vocalType: s.vocalType });
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1>Songs</h1>
        <button onClick={() => setShowCreate(true)}>+ New Song</button>
      </div>

      <DataTable<Song>
        columns={[...COLUMNS, {
          key: "house", header: "House Playlist",
          render: (s) => {
            const inHouse = houseIds.has(s.id);
            return (
              <button
                className={inHouse ? "contrast outline" : "secondary outline"}
                style={{ padding: "0.2em 0.5em", whiteSpace: "nowrap" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (inHouse) removeFromHouse.mutate(s.id);
                  else addToHouse.mutate(s.id);
                }}
                title={inHouse ? "Remove from house playlist" : "Add to house playlist"}
              >
                {inHouse ? "★ In House" : "☆ Add"}
              </button>
            );
          },
        }, {
          key: "actions", header: "",
          render: (s) => <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={(e) => { e.stopPropagation(); openEdit(s); }}>Edit</button>,
        }]}
        data={songs ?? []}
        emptyMessage="No songs yet."
        filterPlaceholder="Search songs…"
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Song">
        <form onSubmit={handleCreate}>
          <FormField label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Artist" value={form.artist ?? ""} onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))} />
            <FormField label="Genre" value={form.genre ?? ""} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))} />
            <FormField label="Key" value={form.musicalKey ?? ""} onChange={(e) => setForm((f) => ({ ...f, musicalKey: e.target.value }))} />
            <FormField label="BPM" type="number" value={form.bpm ?? ""} onChange={(e) => setForm((f) => ({ ...f, bpm: Number(e.target.value) || undefined }))} min={0} />
            <div>
              <label>Vocal Type</label>
              <select value={form.vocalType ?? ""} onChange={(e) => setForm((f) => ({ ...f, vocalType: e.target.value || undefined }))}>
                <option value="">—</option>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Both">Both</option>
                <option value="Instrumental">Instrumental</option>
              </select>
            </div>
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createSong.isPending} disabled={createSong.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Song">
        <form onSubmit={handleUpdate}>
          <FormField label="Title" value={editForm.title ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Artist" value={editForm.artist ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, artist: e.target.value }))} />
            <FormField label="Genre" value={editForm.genre ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, genre: e.target.value }))} />
            <FormField label="Key" value={editForm.musicalKey ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, musicalKey: e.target.value }))} />
            <FormField label="BPM" type="number" value={editForm.bpm ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, bpm: Number(e.target.value) || undefined }))} min={0} />
            <div>
              <label>Vocal Type</label>
              <select value={editForm.vocalType ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, vocalType: e.target.value || undefined }))}>
                <option value="">—</option>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Both">Both</option>
                <option value="Instrumental">Instrumental</option>
              </select>
            </div>
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="contrast outline" onClick={() => { setDeleteTarget(editTarget); setEditTarget(null); }}>Delete</button>
            <button type="button" className="secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" aria-busy={updateSong.isPending} disabled={updateSong.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDelete
          open={!!deleteTarget}
          itemName={`${deleteTarget.title}${deleteTarget.artist ? ` – ${deleteTarget.artist}` : ""}`}
          onConfirm={async () => { await deleteSong.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteSong.isPending}
        />
      )}
    </main>
  );
}
