import { useState } from "react";
import { useSongs, useCreateSong, useUpdateSong, useDeleteSong } from "../../api/hooks/useSongs.js";
import { useHousePlaylist, useAddToHousePlaylist, useRemoveFromHousePlaylist } from "../../api/hooks/useHousePlaylist.js";
import { useGenres, useCreateGenre, useDeleteGenre } from "../../api/hooks/useGenres.js";
import type { CreateSongRequest, UpdateSongRequest, Song } from "@get-down/shared";
import { formatDuration } from "../../utils/formatDuration.js";
import DataTable, { type Column } from "../../components/DataTable.js";
import Modal from "../../components/Modal.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import FormField from "../../components/FormField.js";
import DurationInput from "../../components/DurationInput.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";

const COLUMNS: Column<Song>[] = [
  { key: "title", header: "Title", sortable: true },
  { key: "artist", header: "Artist", sortable: true, render: (s) => s.artist ?? "—" },
  { key: "genre", header: "Genre", sortable: true, render: (s) => s.genre ?? "—" },
  { key: "musicalKey", header: "Key", render: (s) => s.musicalKey ?? "—" },
  { key: "vocalType", header: "Vocal", sortable: true, render: (s) => s.vocalType ?? "—" },
  { key: "duration", header: "Duration", render: (s) => s.duration !== undefined ? formatDuration(s.duration) : "—" },
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
  const { data: genres = [] } = useGenres();
  const createGenre = useCreateGenre();
  const deleteGenre = useDeleteGenre();

  const houseIds = new Set(housePlaylist.map(h => h.songId));

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateSongRequest>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Song | null>(null);
  const [editForm, setEditForm] = useState<UpdateSongRequest>({});
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);

  // Manage Genres modal
  const [showGenres, setShowGenres] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const [genreDeleteErrors, setGenreDeleteErrors] = useState<Record<number, string>>({});

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
    setEditForm({ title: s.title, artist: s.artist, genreId: s.genreId, musicalKey: s.musicalKey, vocalType: s.vocalType, duration: s.duration });
  }

  async function handleAddGenre(e: React.FormEvent) {
    e.preventDefault();
    if (!newGenreName.trim()) return;
    await createGenre.mutateAsync({ name: newGenreName.trim() });
    setNewGenreName("");
  }

  async function handleDeleteGenre(id: number) {
    setGenreDeleteErrors(prev => { const next = { ...prev }; delete next[id]; return next; });
    try {
      await deleteGenre.mutateAsync(id);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Failed to delete genre";
      setGenreDeleteErrors(prev => ({ ...prev, [id]: message }));
    }
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1>Songs</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="secondary outline" onClick={() => setShowGenres(true)}>Manage Genres</button>
          <button onClick={() => setShowCreate(true)}>+ New Song</button>
        </div>
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

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Song">
        <form onSubmit={handleCreate}>
          <FormField label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Artist" value={form.artist ?? ""} onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))} />
            <div>
              <label>Genre</label>
              <select value={form.genreId ?? ""} onChange={(e) => setForm((f) => ({ ...f, genreId: e.target.value ? Number(e.target.value) : undefined }))}>
                <option value="">—</option>
                {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <FormField label="Key" value={form.musicalKey ?? ""} onChange={(e) => setForm((f) => ({ ...f, musicalKey: e.target.value }))} />
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
            <div>
              <label>Duration</label>
              <DurationInput value={form.duration} onChange={(v) => setForm((f) => ({ ...f, duration: v }))} />
            </div>
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" aria-busy={createSong.isPending} disabled={createSong.isPending}>Create</button>
          </footer>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Song">
        <form onSubmit={handleUpdate}>
          <FormField label="Title" value={editForm.title ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Artist" value={editForm.artist ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, artist: e.target.value }))} />
            <div>
              <label>Genre</label>
              <select value={editForm.genreId ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, genreId: e.target.value ? Number(e.target.value) : undefined }))}>
                <option value="">—</option>
                {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <FormField label="Key" value={editForm.musicalKey ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, musicalKey: e.target.value }))} />
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
            <div>
              <label>Duration</label>
              <DurationInput value={editForm.duration} onChange={(v) => setEditForm((f) => ({ ...f, duration: v }))} />
            </div>
          </div>
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="contrast outline" onClick={() => { setDeleteTarget(editTarget); setEditTarget(null); }}>Delete</button>
            <button type="button" className="secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" aria-busy={updateSong.isPending} disabled={updateSong.isPending}>Save</button>
          </footer>
        </form>
      </Modal>

      {/* Manage Genres modal */}
      <Modal open={showGenres} onClose={() => setShowGenres(false)} title="Manage Genres">
        <form onSubmit={handleAddGenre} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="New genre name"
            value={newGenreName}
            onChange={e => setNewGenreName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" aria-busy={createGenre.isPending} disabled={createGenre.isPending || !newGenreName.trim()}>
            Add
          </button>
        </form>
        {genres.length === 0 ? (
          <p style={{ color: "var(--pico-muted-color)" }}>No genres yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {genres.map(g => (
              <li key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid var(--pico-muted-border-color)" }}>
                <span>{g.name}</span>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                  <button
                    className="contrast outline"
                    style={{ padding: "0.1em 0.5em", fontSize: "0.8rem" }}
                    onClick={() => handleDeleteGenre(g.id)}
                    aria-busy={deleteGenre.isPending}
                    disabled={deleteGenre.isPending}
                  >
                    Delete
                  </button>
                  {genreDeleteErrors[g.id] && (
                    <small style={{ color: "var(--pico-del-color)" }}>{genreDeleteErrors[g.id]}</small>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
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
