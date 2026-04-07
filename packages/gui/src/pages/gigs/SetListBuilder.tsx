import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { SetListItemWithSong } from "@get-down/shared";
import { useGig } from "../../api/hooks/useGigs.js";
import {
  useGigSetList,
  useAddSetListItem,
  useRemoveSetListItem,
  useReorderSetList,
  useBulkImportSetList,
  useSongs,
  useUpdateSetListItem,
} from "../../api/hooks/useSongs.js";
import { useGigSongPreferences, useUpdateGigSongPreferences } from "../../api/hooks/useGigSongPreferences.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import SortableSetListRow from "./SortableSetListRow.js";
import SongPrefList from "./SongPrefList.js";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SetListBuilder() {
  const { id } = useParams<{ id: string }>();
  const gigId = Number(id);

  const { data: gig } = useGig(gigId);
  const { data: setList = [], isLoading, error } = useGigSetList(gigId);
  const { data: songs = [] } = useSongs();
  const { data: prefs } = useGigSongPreferences(gigId);

  const reorder = useReorderSetList();
  const bulkImport = useBulkImportSetList();
  const addItem = useAddSetListItem();
  const removeItem = useRemoveSetListItem();
  const updatePrefs = useUpdateGigSongPreferences();
  const updateItem = useUpdateSetListItem();

  // Local ordering state (drives optimistic DnD)
  const [localOrder, setLocalOrder] = useState<SetListItemWithSong[] | null>(null);
  const ordered = localOrder ?? setList;

  // Preferences local state
  const [prefsLocal, setPrefsLocal] = useState<{ favourites: number[]; mustPlays: number[]; doNotPlays: number[] } | null>(null);
  const activePrefs = prefsLocal ?? prefs ?? { favourites: [], mustPlays: [], doNotPlays: [] };

  // Add song
  const [addSearch, setAddSearch] = useState("");
  const existingSongIds = new Set(setList.map(i => i.songId));
  const filteredAdd = songs.filter(
    s => !existingSongIds.has(s.id) && (
      addSearch === "" ||
      s.title.toLowerCase().includes(addSearch.toLowerCase()) ||
      (s.artist ?? "").toLowerCase().includes(addSearch.toLowerCase())
    )
  );

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const items = localOrder ?? setList;
      const oldIdx = items.findIndex(i => i.id === active.id);
      const newIdx = items.findIndex(i => i.id === over.id);
      const reordered = arrayMove(items, oldIdx, newIdx);
      setLocalOrder(reordered);
      reorder.mutate(
        { gigId, itemIds: reordered.map(i => i.id) },
        { onSuccess: () => setLocalOrder(null) }
      );
    },
    [gigId, localOrder, setList, reorder]
  );

  async function handleImport() {
    await bulkImport.mutateAsync(gigId);
    setLocalOrder(null);
  }

  async function handleSavePrefs() {
    if (!prefsLocal) return;
    await updatePrefs.mutateAsync({ gigId, input: prefsLocal });
    setPrefsLocal(null);
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to="/gigs">Gigs</Link></li>
          <li><Link to={`/gigs/${gigId}`}>{gig ? `${gig.firstName} ${gig.lastName}` : `Gig ${gigId}`}</Link></li>
          <li>Set List</li>
        </ul>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Set List</h1>
        <button
          className="secondary"
          onClick={handleImport}
          aria-busy={bulkImport.isPending}
          disabled={bulkImport.isPending}
          title="Add all favourites & must-plays (excluding do-not-plays and already added songs)"
        >
          Import from Preferences
        </button>
      </div>

      {/* Set list */}
      <section>
        {ordered.length === 0 ? (
          <p style={{ color: "var(--pico-muted-color)" }}>No songs in the set list yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ordered.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {ordered.map((item, i) => (
                <SortableSetListRow
                  key={item.id}
                  item={item}
                  index={i}
                  removing={removeItem.isPending}
                  onRemove={(itemId) => removeItem.mutate({ gigId, itemId })}
                  onUpdateItem={(itemId, field, value) =>
                    updateItem.mutate({
                      gigId,
                      itemId,
                      overrideKey: field === "key" ? value : undefined,
                      overrideVocalType: field === "vocalType" ? value : undefined,
                    })
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Add song */}
        <div style={{ marginTop: "1rem" }}>
          <input
            type="search"
            placeholder="Add a song…"
            value={addSearch}
            onChange={e => setAddSearch(e.target.value)}
            style={{ marginBottom: "0.25rem" }}
          />
          {addSearch && filteredAdd.slice(0, 10).map(s => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer", padding: "0.3rem 0.5rem", borderRadius: "var(--pico-border-radius)", background: "var(--pico-card-background-color)", border: "1px solid var(--pico-muted-border-color)", marginBottom: "0.15rem" }}
              onClick={() => { addItem.mutate({ gigId, songId: s.id }); setAddSearch(""); }}
              onKeyDown={e => { if (e.key === "Enter") { addItem.mutate({ gigId, songId: s.id }); setAddSearch(""); } }}
            >
              <strong>{s.title}</strong>
              {s.artist && <span style={{ color: "var(--pico-muted-color)" }}> · {s.artist}</span>}
              {s.musicalKey && <small style={{ marginLeft: "0.4rem" }}>{s.musicalKey}</small>}
              {s.vocalType && <small style={{ marginLeft: "0.3rem", color: "var(--pico-muted-color)" }}>({s.vocalType})</small>}
            </div>
          ))}
        </div>
      </section>

      {/* Song Preferences */}
      <section style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>Song Preferences</h2>
          {prefsLocal && (
            <button
              onClick={handleSavePrefs}
              aria-busy={updatePrefs.isPending}
              disabled={updatePrefs.isPending}
            >
              Save Preferences
            </button>
          )}
        </div>
        <SongPrefList
          label="⭐ Favourites"
          ids={activePrefs.favourites}
          songs={songs}
          onChange={favs => setPrefsLocal({ ...activePrefs, favourites: favs })}
        />
        <SongPrefList
          label="🎯 Must Plays"
          ids={activePrefs.mustPlays}
          songs={songs}
          onChange={must => setPrefsLocal({ ...activePrefs, mustPlays: must })}
        />
        <SongPrefList
          label="🚫 Do Not Plays"
          ids={activePrefs.doNotPlays}
          songs={songs}
          onChange={dnp => setPrefsLocal({ ...activePrefs, doNotPlays: dnp })}
        />
      </section>
    </main>
  );
}
