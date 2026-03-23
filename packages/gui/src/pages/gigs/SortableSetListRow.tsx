import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SetListItemWithSong } from "@get-down/shared";

interface Props {
  item: SetListItemWithSong;
  index: number;
  onRemove: (itemId: number) => void;
  removing: boolean;
}

export default function SortableSetListRow({ item, index, onRemove, removing }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: "grid",
    gridTemplateColumns: "2rem 1.5rem 1fr auto auto auto",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.4rem 0.6rem",
    background: "var(--pico-card-background-color)",
    border: "1px solid var(--pico-muted-border-color)",
    borderRadius: "var(--pico-border-radius)",
    marginBottom: "0.25rem",
    cursor: isDragging ? "grabbing" : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: "grab", fontSize: "1.1rem", lineHeight: 1, userSelect: "none", touchAction: "none" }}
        title="Drag to reorder"
      >
        ⠿
      </span>
      <small style={{ color: "var(--pico-muted-color)", fontVariantNumeric: "tabular-nums" }}>
        {index + 1}
      </small>
      <div>
        <strong>{item.title}</strong>
        {item.artist && <span style={{ color: "var(--pico-muted-color)" }}> · {item.artist}</span>}
        {item.musicalKey && (
          <small style={{ marginLeft: "0.4rem", background: "var(--pico-secondary-background)", padding: "0 0.3em", borderRadius: "0.2em" }}>
            {item.musicalKey}
          </small>
        )}
        {item.vocalType && (
          <small style={{ marginLeft: "0.3rem", color: "var(--pico-muted-color)" }}>
            ({item.vocalType})
          </small>
        )}
      </div>
      {item.isMustPlay && (
        <small style={{ whiteSpace: "nowrap", background: "var(--pico-del-color)", color: "#fff", padding: "0.1em 0.4em", borderRadius: "0.25em", fontSize: "0.7rem" }}>
          MUST PLAY
        </small>
      )}
      {item.isFavourite && !item.isMustPlay && (
        <small style={{ whiteSpace: "nowrap", background: "var(--pico-ins-color)", color: "#fff", padding: "0.1em 0.4em", borderRadius: "0.25em", fontSize: "0.7rem" }}>
          ★ FAV
        </small>
      )}
      {!item.isMustPlay && !item.isFavourite && <span />}
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
