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
  useAddSetListSection,
  useRenameSetListSection,
  useRemoveSetListItem,
  useReorderSetList,
  useBulkImportSetList,
  useSongs,
  useUpdateSetListItem,
  useAutoOrderSetList,
  useClearSetList,
  useBulkRemoveSetListItems,
} from "../../api/hooks/useSongs.js";
import { useGigSongPreferences } from "../../api/hooks/useGigSongPreferences.js";
import { useHousePlaylist } from "../../api/hooks/useHousePlaylist.js";
import { apiFetchBlob } from "../../api/client.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import SortableSetListRow from "./SortableSetListRow.js";
import SortableSetListSection from "./SortableSetListSection.js";
import SongPrefList from "./SongPrefList.js";
import HousePlaylistPanel from "./HousePlaylistPanel.js";
import EditSetListItemModal, { type EditSetListItemSubmit } from "./EditSetListItemModal.js";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SetListBuilder() {
  const { id } = useParams<{ id: string }>();
  const gigId = Number(id);

  const { data: gig } = useGig(gigId);
  const { data: setList = [], isLoading, error } = useGigSetList(gigId);
  const { data: songs = [] } = useSongs();
  const { data: prefs } = useGigSongPreferences(gigId);
  const { data: housePlaylist = [] } = useHousePlaylist();

  const reorder = useReorderSetList();
  const bulkImport = useBulkImportSetList();
  const autoOrder = useAutoOrderSetList();
  const addItem = useAddSetListItem();
  const addSection = useAddSetListSection();
  const renameSection = useRenameSetListSection();
  const removeItem = useRemoveSetListItem();
  const updateItem = useUpdateSetListItem();
  const clearAll = useClearSetList();
  const bulkRemove = useBulkRemoveSetListItems();

  // We add from the house playlist using the regular addItem mutation
  const addFromHouse = useAddSetListItem();

  // Local ordering state (drives optimistic DnD)
  const [localOrder, setLocalOrder] = useState<SetListItemWithSong[] | null>(null);
  const ordered = localOrder ?? setList;

  const [downloadPending, setDownloadPending] = useState(false);

  // Bulk selection state (only songs, not section headers)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function toggleSelect(itemId: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  const songItems = ordered.filter(i => i.itemType === "song");
  const sectionCount = ordered.filter(i => i.itemType === "section").length;

  function toggleSelectAll() {
    if (selectedIds.size === songItems.length && songItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(songItems.map(i => i.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    await bulkRemove.mutateAsync({ gigId, itemIds: [...selectedIds] });
    setSelectedIds(new Set());
    setLocalOrder(null);
  }

  async function handleClearAll() {
    if (!window.confirm(`Remove all ${ordered.length} items from this set list?`)) return;
    await clearAll.mutateAsync(gigId);
    setSelectedIds(new Set());
    setLocalOrder(null);
  }

  // Add song search
  const [addSearch, setAddSearch] = useState("");
  const existingSongIds = new Set(setList.map(i => i.songId).filter((id): id is number => id !== undefined));
  const doNotPlaySet = new Set(prefs?.doNotPlays ?? []);

  const filteredAdd = songs.filter(
    s => !existingSongIds.has(s.id) && (
      addSearch === "" ||
      s.title.toLowerCase().includes(addSearch.toLowerCase()) ||
      (s.artist ?? "").toLowerCase().includes(addSearch.toLowerCase())
    )
  );

  // Edit modal state
  const [editingItem, setEditingItem] = useState<SetListItemWithSong | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const modalOpen = showCreate || editingItem !== null;

  function openCreate() {
    setEditingItem(null);
    setShowCreate(true);
  }

  function openEdit(item: SetListItemWithSong) {
    setShowCreate(false);
    setEditingItem(item);
  }

  function closeModal() {
    setEditingItem(null);
    setShowCreate(false);
  }

  async function handleEditItem(form: EditSetListItemSubmit) {
    const mins = parseInt(form.durationMinutes, 10);
    const secs = parseInt(form.durationSeconds, 10);
    const hasDuration = !isNaN(mins) || !isNaN(secs);
    const totalSeconds = ((isNaN(mins) ? 0 : mins) * 60) + (isNaN(secs) ? 0 : secs);
    const duration = (form.durationMinutes === "" && form.durationSeconds === "")
      ? null
      : hasDuration && totalSeconds > 0 ? totalSeconds : null;

    if (editingItem) {
      if (editingItem.songId) {
        await updateItem.mutateAsync({
          gigId,
          itemId: editingItem.id,
          overrideKey: form.key || null,
          overrideKeyChange: form.keyChange || null,
          overrideVocalType: form.vocalType || null,
          overrideDuration: duration,
        });
      } else {
        await updateItem.mutateAsync({
          gigId,
          itemId: editingItem.id,
          unlinkedTitle: form.title || null,
          unlinkedArtist: form.artist || null,
          unlinkedKey: form.key || null,
          unlinkedKeyChange: form.keyChange || null,
          unlinkedVocalType: form.vocalType || null,
          unlinkedDuration: duration,
        });
      }
    } else {
      await addItem.mutateAsync({
        gigId,
        unlinkedTitle: form.title,
        unlinkedArtist: form.artist || undefined,
        unlinkedKey: form.key || undefined,
        unlinkedKeyChange: form.keyChange || undefined,
        unlinkedVocalType: form.vocalType || undefined,
        unlinkedDuration: duration ?? undefined,
      });
    }

    closeModal();
  }

  async function handleAddSection() {
    const name = window.prompt("Section name:", "Set 2");
    if (!name?.trim()) return;
    await addSection.mutateAsync({ gigId, sectionName: name.trim() });
    setLocalOrder(null);
  }

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

  async function handleAutoOrder() {
    await autoOrder.mutateAsync(gigId);
    setLocalOrder(null);
  }

  async function handleDownloadPdf() {
    setDownloadPending(true);
    try {
      const blob = await apiFetchBlob("GET", `/gigs/${gigId}/set-list/pdf`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Revoke after a short delay to give the new tab time to load the blob
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setDownloadPending(false);
    }
  }

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  // Build a rendered list with per-section duration footers injected
  const listWithSectionTotals = buildRenderedList(ordered);

  return (
    <main className="container">
      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to="/gigs">Gigs</Link></li>
          <li><Link to={`/gigs/${gigId}`}>{gig ? `${gig.firstName} ${gig.lastName}` : `Gig ${gigId}`}</Link></li>
          <li>Set List</li>
        </ul>
      </nav>

      {/* Page header row with action buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Set List</h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="secondary outline"
            onClick={handleDownloadPdf}
            aria-busy={downloadPending}
            disabled={downloadPending || songItems.length === 0}
            title="Download set list as PDF"
          >
            ↓ PDF
          </button>
          <button
            className="secondary outline"
            onClick={handleAutoOrder}
            aria-busy={autoOrder.isPending}
            disabled={autoOrder.isPending || songItems.length === 0}
            title="Auto-order: alternates Male/Female per section, spreads must-plays evenly, untyped songs last"
          >
            Auto-order
          </button>
          <button
            className="secondary"
            onClick={handleImport}
            aria-busy={bulkImport.isPending}
            disabled={bulkImport.isPending}
            title="Add all favourites & must-plays (excluding do-not-plays and already added songs)"
          >
            Import from Preferences
          </button>
          <button
            className="contrast outline"
            onClick={handleClearAll}
            aria-busy={clearAll.isPending}
            disabled={clearAll.isPending || ordered.length === 0}
            title="Remove all songs and sections from this set list"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Two-column layout on desktop, single column on mobile */}
      <div className="set-list-layout">
        {/* Left column: set list + add */}
        <div>
          <section>
            {songItems.length === 0 && sectionCount === 0 ? (
              <p style={{ color: "var(--pico-muted-color)" }}>No songs in the set list yet.</p>
            ) : (
              <>
                {/* Bulk-action bar */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", margin: 0, fontSize: "0.85rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === songItems.length && songItems.length > 0}
                      onChange={toggleSelectAll}
                      style={{ margin: 0 }}
                    />
                    {selectedIds.size === 0
                      ? "Select all"
                      : `${selectedIds.size} selected`}
                  </label>
                  {selectedIds.size > 0 && (
                    <button
                      className="contrast outline"
                      onClick={handleBulkDelete}
                      aria-busy={bulkRemove.isPending}
                      disabled={bulkRemove.isPending}
                      style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }}
                    >
                      Delete selected
                    </button>
                  )}
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={ordered.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {listWithSectionTotals.map(entry => {
                      if (entry.type === "section") {
                        return (
                          <SortableSetListSection
                            key={entry.item.id}
                            item={entry.item}
                            isOnly={sectionCount <= 1}
                            onRename={(itemId, name) => renameSection.mutate({ gigId, itemId, sectionName: name })}
                            onDelete={(itemId) => removeItem.mutate({ gigId, itemId })}
                            isRenaming={renameSection.isPending}
                          />
                        );
                      }
                      if (entry.type === "song") {
                        return (
                          <SortableSetListRow
                            key={entry.item.id}
                            item={entry.item}
                            index={entry.sectionIndex}
                            removing={removeItem.isPending}
                            selected={selectedIds.has(entry.item.id)}
                            onToggleSelect={toggleSelect}
                            onRemove={(itemId) => removeItem.mutate({ gigId, itemId })}
                            onEdit={openEdit}
                          />
                        );
                      }
                      // Section duration footer
                      return (
                        <div
                          key={entry.key}
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: "0.4rem",
                            color: "var(--pico-muted-color)",
                            fontSize: "0.85rem",
                            padding: "0.25rem 0.75rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <span>{entry.sectionName} total:</span>
                          <strong style={{ color: "var(--pico-color)" }}>
                            {formatTotalDuration(entry.seconds)}
                          </strong>
                        </div>
                      );
                    })}
                  </SortableContext>
                </DndContext>

                {/* Overall set duration total */}
                {(() => {
                  const totalSeconds = songItems.reduce((acc, item) => acc + (item.duration ?? 0), 0);
                  if (totalSeconds === 0) return null;
                  return (
                    <div style={{
                      marginTop: "0.75rem",
                      paddingTop: "0.5rem",
                      borderTop: "1px solid var(--pico-muted-border-color)",
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: "0.4rem",
                      color: "var(--pico-muted-color)",
                      fontSize: "0.9rem",
                    }}>
                      <span>Total set time:</span>
                      <strong style={{ color: "var(--pico-color)" }}>
                        {formatTotalDuration(totalSeconds)}
                      </strong>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Add song + add section controls */}
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <input
                  type="search"
                  placeholder="Add a song from catalogue…"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  style={{ marginBottom: "0.25rem" }}
                />
                {addSearch && filteredAdd.slice(0, 10).map(s => {
                  const isDnp = doNotPlaySet.has(s.id);
                  return (
                    <div
                      key={s.id}
                      tabIndex={0}
                      aria-label={`Add ${s.title}${s.artist ? ` by ${s.artist}` : ""}${isDnp ? " (Do Not Play warning)" : ""} to set list`}
                      style={{
                        cursor: "pointer",
                        padding: "0.3rem 0.5rem",
                        borderRadius: "var(--pico-border-radius)",
                        background: "var(--pico-card-background-color)",
                        border: isDnp
                          ? "1px solid var(--pico-del-color)"
                          : "1px solid var(--pico-muted-border-color)",
                        marginBottom: "0.15rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        flexWrap: "wrap",
                      }}
                      onClick={() => { addItem.mutate({ gigId, songId: s.id }); setAddSearch(""); }}
                      onKeyDown={e => { if (e.key === "Enter") { addItem.mutate({ gigId, songId: s.id }); setAddSearch(""); } }}
                    >
                      <strong>{s.title}</strong>
                      {s.artist && <span style={{ color: "var(--pico-muted-color)" }}>· {s.artist}</span>}
                      {s.musicalKey && <small style={{ marginLeft: "0.2rem" }}>{s.musicalKey}</small>}
                      {s.vocalType && <small style={{ color: "var(--pico-muted-color)" }}>({s.vocalType})</small>}
                      {isDnp && (
                        <small style={{
                          marginLeft: "auto",
                          background: "var(--pico-del-color)",
                          color: "#fff",
                          padding: "0.05em 0.4em",
                          borderRadius: "0.2em",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                        }}>
                          ⚠ Do Not Play
                        </small>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <button
                  className="secondary outline"
                  onClick={openCreate}
                  style={{ whiteSpace: "nowrap" }}
                >
                  + Add unlisted song
                </button>
                <button
                  className="secondary outline"
                  onClick={handleAddSection}
                  aria-busy={addSection.isPending}
                  disabled={addSection.isPending}
                  style={{ whiteSpace: "nowrap" }}
                  title="Add a new section divider (e.g. Set 2, Encore)"
                >
                  + Add section
                </button>
              </div>
            </div>
          </section>

          {/* Song Preferences — read-only reference */}
          <section style={{ marginTop: "2rem" }}>
            <h2 style={{ marginBottom: "0.75rem" }}>Song Preferences</h2>
            <SongPrefList
              label="⭐ Favourites"
              ids={prefs?.favourites ?? []}
              songs={songs}
              readOnly
            />
            <SongPrefList
              label="🎯 Must Plays"
              ids={prefs?.mustPlays ?? []}
              songs={songs}
              readOnly
            />
            <SongPrefList
              label="🚫 Do Not Plays"
              ids={prefs?.doNotPlays ?? []}
              songs={songs}
              readOnly
            />
          </section>
        </div>

        {/* Right column: house playlist panel */}
        <HousePlaylistPanel
          songs={housePlaylist}
          setListSongIds={existingSongIds}
          doNotPlayIds={doNotPlaySet}
          onAdd={(songId) => addFromHouse.mutate({ gigId, songId })}
          isAdding={addFromHouse.isPending}
        />
      </div>

      {/* Edit / create modal */}
      <EditSetListItemModal
        open={modalOpen}
        item={editingItem}
        isLinked={editingItem !== null && !!editingItem.songId}
        modalTitle={
          showCreate
            ? "Add unlisted song"
            : editingItem?.songId
              ? "Edit song"
              : "Edit unlisted song"
        }
        onClose={closeModal}
        onSubmit={handleEditItem}
        isPending={addItem.isPending || updateItem.isPending}
      />
    </main>
  );
}

// ─── Rendered list builder ────────────────────────────────────────────────────

type RenderedSong = { type: "song"; item: SetListItemWithSong; sectionIndex: number };
type RenderedSection = { type: "section"; item: SetListItemWithSong };
type RenderedSectionTotal = { type: "total"; key: string; sectionName: string; seconds: number };
type RenderedEntry = RenderedSong | RenderedSection | RenderedSectionTotal;

/**
 * Takes the flat ordered list and produces a render-ready array that interleaves
 * song rows, section header rows, and per-section duration footer rows.
 * Duration footers are NOT placed inside the DnD SortableContext — they are
 * injected after each section's last song and keyed by a synthetic key.
 */
function buildRenderedList(ordered: SetListItemWithSong[]): RenderedEntry[] {
  const result: RenderedEntry[] = [];

  let currentSectionName = "";
  let sectionSongIndex = 0;
  let sectionSeconds = 0;
  let hasSection = false;
  let sectionIndex = 0;

  function flushSectionTotal() {
    if (hasSection && sectionSeconds > 0) {
      result.push({
        type: "total",
        key: `total-section-${sectionIndex}`,
        sectionName: currentSectionName,
        seconds: sectionSeconds,
      });
    }
  }

  for (const item of ordered) {
    if (item.itemType === "section") {
      flushSectionTotal();
      sectionIndex++;
      currentSectionName = item.sectionName ?? "Set 1";
      sectionSongIndex = 0;
      sectionSeconds = 0;
      hasSection = true;
      result.push({ type: "section", item });
    } else {
      result.push({ type: "song", item, sectionIndex: sectionSongIndex });
      sectionSongIndex++;
      sectionSeconds += item.duration ?? 0;
    }
  }

  // Flush the last section's total
  flushSectionTotal();

  return result;
}

// ─── Duration helpers ─────────────────────────────────────────────────────────

/** Format seconds as Xh Ym or Ym for the total set duration footer */
function formatTotalDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
