import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SetListItemWithSong } from "@get-down/shared";

interface Props {
  item: SetListItemWithSong;
  index: number;
  onRemove: (itemId: number) => void;
  removing: boolean;
  onUpdateItem: (itemId: number, field: "key" | "vocalType" | "unlinkedTitle" | "unlinkedArtist" | "unlinkedKey" | "unlinkedVocalType", value: string | null) => void;
  onEditUnlinked?: (item: SetListItemWithSong) => void;
}

export default function SortableSetListRow({ item, index, onRemove, removing, onUpdateItem, onEditUnlinked }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const isUnlinked = !item.songId;

  const [editingField, setEditingField] = useState<"key" | "vocalType" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [focusedField, setFocusedField] = useState<"key" | "vocalType" | null>(null);
  // Guard against onBlur firing after Enter/Escape already committed
  const committedRef = useRef(false);

  // For linked songs, overrides take precedence; for unlinked, use unlinked fields directly
  const displayKey = isUnlinked
    ? item.unlinkedKey
    : (item.overrideKey ?? item.musicalKey);
  const displayVocalType = isUnlinked
    ? item.unlinkedVocalType
    : (item.overrideVocalType ?? item.vocalType);

  function startEdit(field: "key" | "vocalType") {
    committedRef.current = false;
    setEditingField(field);
    setFocusedField(null);
    setEditValue(field === "key" ? (displayKey ?? "") : (displayVocalType ?? ""));
  }

  function commit(field: "key" | "vocalType") {
    if (committedRef.current) return;
    committedRef.current = true;
    setEditingField(null);
    const value = editValue.trim() || null;
    if (isUnlinked) {
      onUpdateItem(item.id, field === "key" ? "unlinkedKey" : "unlinkedVocalType", value);
    } else {
      onUpdateItem(item.id, field === "key" ? "key" : "vocalType", value);
    }
  }

  function cancel() {
    committedRef.current = true;
    setEditingField(null);
  }

  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: "grid",
    gridTemplateColumns: "1.5rem 1.5rem 1fr auto auto auto",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.25rem 0.75rem",
    background: item.isDoNotPlay
      ? "color-mix(in srgb, var(--pico-del-color) 8%, var(--pico-card-background-color))"
      : "var(--pico-card-background-color)",
    border: item.isDoNotPlay
      ? "1px solid color-mix(in srgb, var(--pico-del-color) 40%, transparent)"
      : "1px solid var(--pico-muted-border-color)",
    borderRadius: "var(--pico-border-radius)",
    marginBottom: "0.25rem",
    cursor: isDragging ? "grabbing" : undefined,
  };

  return (
    <div ref={setNodeRef} style={rowStyle}>
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: "grab",
          fontSize: "1rem",
          lineHeight: 1,
          userSelect: "none",
          touchAction: "none",
          color: "var(--pico-muted-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          padding: 0,
          boxShadow: "none",
        }}
        title="Drag to reorder"
      >
        ⠿
      </span>

      {/* Row number */}
      <small style={{ color: "var(--pico-muted-color)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
        {index + 1}
      </small>

      {/* Song info */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", minWidth: 0 }}>
        {/* Title — for unlinked songs, show an edit icon to open the edit modal */}
        <strong
          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: isUnlinked ? "pointer" : undefined }}
          title={isUnlinked ? "Click to edit this song" : undefined}
          role={isUnlinked ? "button" : undefined}
          tabIndex={isUnlinked ? 0 : undefined}
          aria-label={isUnlinked ? `Edit unlinked song: ${item.title}` : undefined}
          onClick={isUnlinked ? () => onEditUnlinked?.(item) : undefined}
          onKeyDown={isUnlinked ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEditUnlinked?.(item); } } : undefined}
        >
          {item.title}
          {isUnlinked && <span style={{ marginLeft: "0.3rem", fontSize: "0.7rem", color: "var(--pico-muted-color)" }}>✎</span>}
        </strong>
        {item.artist && (
          <span style={{ color: "var(--pico-muted-color)", whiteSpace: "nowrap" }}>· {item.artist}</span>
        )}

        {/* Key — inline editable */}
        {editingField === "key" ? (
          <input
            type="text"
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); commit("key"); }
              if (e.key === "Escape") { e.preventDefault(); cancel(); }
            }}
            onBlur={() => commit("key")}
            style={{
              width: "3rem",
              height: "1.4em",
              padding: "0 0.3em",
              margin: 0,
              lineHeight: 1,
              boxSizing: "border-box",
              fontSize: "0.78rem",
              borderRadius: "0.25em",
              border: "1px solid var(--pico-primary)",
              outline: "2px solid var(--pico-primary-focus)",
              outlineOffset: "1px",
            }}
            placeholder="e.g. G"
            aria-label="Override key"
          />
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={() => startEdit("key")}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit("key"); } }}
            onFocus={() => setFocusedField("key")}
            onBlur={() => setFocusedField(null)}
            title="Click to edit key"
            aria-label={`Edit key: ${displayKey ?? "add key"}`}
            style={
              focusedField === "key"
                ? { ...(displayKey ? keyBadgeStyle : placeholderStyle), outline: "2px solid var(--pico-primary-focus)", outlineOffset: "2px" }
                : displayKey ? keyBadgeStyle : placeholderStyle
            }
          >
            {displayKey ?? "add key"}
          </span>
        )}

        {/* Vocal type — inline editable */}
        {editingField === "vocalType" ? (
          <input
            type="text"
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); commit("vocalType"); }
              if (e.key === "Escape") { e.preventDefault(); cancel(); }
            }}
            onBlur={() => commit("vocalType")}
            style={{
              width: "4.5rem",
              height: "1.4em",
              padding: "0 0.3em",
              margin: 0,
              lineHeight: 1,
              boxSizing: "border-box",
              fontSize: "0.78rem",
              borderRadius: "0.25em",
              border: "1px solid var(--pico-primary)",
              outline: "2px solid var(--pico-primary-focus)",
              outlineOffset: "1px",
            }}
            placeholder="e.g. Male"
            aria-label="Vocal type"
          />
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={() => startEdit("vocalType")}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit("vocalType"); } }}
            onFocus={() => setFocusedField("vocalType")}
            onBlur={() => setFocusedField(null)}
            title="Click to edit vocal type"
            aria-label={`Edit vocal type: ${displayVocalType ?? "add vocal type"}`}
            style={
              focusedField === "vocalType"
                ? { ...(displayVocalType ? vocalTypeBadgeStyle : placeholderStyle), outline: "2px solid var(--pico-primary-focus)", outlineOffset: "2px" }
                : displayVocalType ? vocalTypeBadgeStyle : placeholderStyle
            }
          >
            {displayVocalType ?? "add vocal type"}
          </span>
        )}
      </div>

      {/* Badges column — DNP takes priority, then Must Play, then Fav */}
      {item.isDoNotPlay ? (
        <small style={doNotPlayBadgeStyle}>⚠ DNP</small>
      ) : item.isMustPlay ? (
        <small style={mustPlayBadgeStyle}>MUST PLAY</small>
      ) : item.isFavourite ? (
        <small style={favBadgeStyle}>★ FAV</small>
      ) : (
        <span />
      )}

      {/* Remove button */}
      <button
        className="contrast outline"
        style={{ padding: "0.1em 0.5em", fontSize: "0.85rem" }}
        onClick={() => onRemove(item.id)}
        aria-busy={removing}
        disabled={removing}
        title="Remove from set list"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Style constants ──────────────────────────────────────────────────────────

const keyBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  background: "var(--pico-secondary-background)",
  color: "var(--pico-secondary-inverse)",
  border: "1px solid var(--pico-secondary-border)",
  padding: "0.05em 0.45em",
  borderRadius: "0.25em",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.02em",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const vocalTypeBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  background: "var(--pico-ins-color)",
  color: "#fff",
  border: "1px solid transparent",
  padding: "0.05em 0.45em",
  borderRadius: "0.25em",
  fontSize: "0.75rem",
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const placeholderStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "var(--pico-muted-color)",
  cursor: "pointer",
  opacity: 0.7,
  whiteSpace: "nowrap",
};

const mustPlayBadgeStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  background: "var(--pico-del-color)",
  color: "#fff",
  padding: "0.1em 0.4em",
  borderRadius: "0.25em",
  fontSize: "0.7rem",
};

const favBadgeStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  background: "var(--pico-ins-color)",
  color: "#fff",
  padding: "0.1em 0.4em",
  borderRadius: "0.25em",
  fontSize: "0.7rem",
};

const doNotPlayBadgeStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  background: "var(--pico-del-color)",
  color: "#fff",
  padding: "0.1em 0.4em",
  borderRadius: "0.25em",
  fontSize: "0.7rem",
  fontWeight: 700,
};
