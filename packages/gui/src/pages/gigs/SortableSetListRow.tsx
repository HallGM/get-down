import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SetListItemWithSong } from "@get-down/shared";
import { formatDuration } from "../../utils/formatDuration.js";
import Badge from "../../components/Badge.js";

interface Props {
  item: SetListItemWithSong;
  index: number;
  onRemove: (itemId: number) => void;
  removing: boolean;
  selected: boolean;
  onToggleSelect: (itemId: number) => void;
  onEdit: (item: SetListItemWithSong) => void;
}

export default function SortableSetListRow({ item, index, onRemove, removing, selected, onToggleSelect, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const isUnlinked = !item.songId;

  const displayKey = isUnlinked
    ? item.unlinkedKey
    : (item.overrideKey ?? item.musicalKey);
  const displayKeyChange = isUnlinked
    ? item.unlinkedKeyChange
    : (item.overrideKeyChange ?? item.keyChange);
  const displayVocalType = isUnlinked
    ? item.unlinkedVocalType
    : (item.overrideVocalType ?? item.vocalType);
  const displayDuration = isUnlinked
    ? item.duration
    : (item.overrideDuration ?? item.duration);

  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: "grid",
    gridTemplateColumns: "1.2rem 1.5rem 1.5rem 1fr auto auto auto auto",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.25rem 0.75rem",
    background: selected
      ? "color-mix(in srgb, var(--pico-primary) 8%, var(--pico-card-background-color))"
      : item.isDoNotPlay
        ? "color-mix(in srgb, var(--pico-del-color) 8%, var(--pico-card-background-color))"
        : "var(--pico-card-background-color)",
    border: selected
      ? "1px solid color-mix(in srgb, var(--pico-primary) 40%, transparent)"
      : item.isDoNotPlay
        ? "1px solid color-mix(in srgb, var(--pico-del-color) 40%, transparent)"
        : "1px solid var(--pico-muted-border-color)",
    borderRadius: "var(--pico-border-radius)",
    marginBottom: "0.25rem",
    cursor: isDragging ? "grabbing" : undefined,
  };

  return (
    <div ref={setNodeRef} style={rowStyle}>
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(item.id)}
        aria-label={`Select ${item.title}`}
        style={{ margin: 0, cursor: "pointer" }}
      />

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
        <strong style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.title}
        </strong>
        {item.artist && (
          <span style={{ color: "var(--pico-muted-color)", whiteSpace: "nowrap" }}>· {item.artist}</span>
        )}

        {/* Duration */}
        {displayDuration !== undefined && (
          <small style={{ color: "var(--pico-muted-color)", fontVariantNumeric: "tabular-nums" }}>
            {formatDuration(displayDuration)}
          </small>
        )}

        {/* Key badge */}
        {displayKey && (
          <Badge
            label={displayKey}
            background="var(--pico-secondary-background)"
            color="var(--pico-secondary-inverse)"
            fontSize="0.75rem"
            style={{ padding: "0.05em 0.45em", letterSpacing: "0.02em", border: "1px solid var(--pico-secondary-border)" }}
          />
        )}

        {/* Key change badge */}
        {displayKeyChange && (
          <Badge
            label={displayKeyChange}
            background="#f59e0b"
            fontSize="0.75rem"
            style={{ padding: "0.05em 0.45em", letterSpacing: "0.02em", border: "1px solid transparent" }}
          />
        )}

        {/* Vocal type badge */}
        {displayVocalType && (
          <Badge
            label={displayVocalType}
            background="var(--pico-ins-color)"
            fontSize="0.75rem"
            style={{ padding: "0.05em 0.45em", fontWeight: 500 }}
          />
        )}
      </div>

      {/* Badges column — DNP takes priority, then Must Play, then Fav */}
      {item.isDoNotPlay ? (
        <Badge label="⚠ DNP" background="var(--pico-del-color)" fontSize="0.7rem" style={{ padding: "0.1em 0.4em", fontWeight: 700 }} />
      ) : item.isMustPlay ? (
        <Badge label="MUST PLAY" background="var(--pico-del-color)" fontSize="0.7rem" style={{ padding: "0.1em 0.4em" }} />
      ) : item.isFavourite ? (
        <Badge label="★ FAV" background="var(--pico-ins-color)" fontSize="0.7rem" style={{ padding: "0.1em 0.4em" }} />
      ) : (
        <span />
      )}

      {/* Edit button */}
      <button
        className="secondary outline"
        style={{ padding: "0.1em 0.5em", fontSize: "0.85rem" }}
        onClick={() => onEdit(item)}
        title="Edit song details"
        aria-label={`Edit ${item.title}`}
      >
        ✎
      </button>

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
