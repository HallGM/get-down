import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SetListItemWithSong } from "@get-down/shared";

interface Props {
  item: SetListItemWithSong;
  isOnly: boolean;
  onRename: (itemId: number, name: string) => void;
  onDelete: (itemId: number) => void;
  isRenaming: boolean;
}

export default function SortableSetListSection({ item, isOnly, onRename, onDelete, isRenaming }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.sectionName ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync when server updates arrive
  useEffect(() => {
    if (!editing) setDraft(item.sectionName ?? "");
  }, [item.sectionName, editing]);

  function startEdit() {
    setDraft(item.sectionName ?? "");
    setEditing(true);
  }

  function commitEdit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.sectionName) {
      onRename(item.id, trimmed);
    } else {
      setDraft(item.sectionName ?? "");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === "Escape") {
      setEditing(false);
      setDraft(item.sectionName ?? "");
    }
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: "grid",
    gridTemplateColumns: "1.5rem 1fr auto auto",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.35rem 0.75rem",
    background: "color-mix(in srgb, var(--pico-primary) 12%, var(--pico-card-background-color))",
    border: "1px solid color-mix(in srgb, var(--pico-primary) 30%, transparent)",
    borderRadius: "var(--pico-border-radius)",
    marginBottom: "0.25rem",
    marginTop: "0.5rem",
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
          color: "var(--pico-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          padding: 0,
          boxShadow: "none",
        }}
        title="Drag to reorder section"
      >
        ⠿
      </span>

      {/* Section name — inline edit on click */}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          aria-label="Section name"
          style={{
            fontWeight: 700,
            fontSize: "0.95rem",
            padding: "0.1em 0.4em",
            borderRadius: "var(--pico-border-radius)",
            border: "1px solid var(--pico-primary)",
            background: "var(--pico-card-background-color)",
            color: "var(--pico-color)",
            width: "100%",
            margin: 0,
          }}
        />
      ) : (
        <strong
          style={{ fontSize: "0.95rem", cursor: "text", userSelect: "none" }}
          onClick={startEdit}
          title="Click to rename section"
        >
          {item.sectionName || "Unnamed section"}
        </strong>
      )}

      {/* Rename button */}
      <button
        className="secondary outline"
        style={{ padding: "0.1em 0.5em", fontSize: "0.8rem" }}
        onClick={startEdit}
        aria-busy={isRenaming}
        disabled={isRenaming || editing}
        title="Rename section"
        aria-label={`Rename section ${item.sectionName}`}
      >
        ✎
      </button>

      {/* Delete button — disabled when this is the only section */}
      <button
        className="contrast outline"
        style={{ padding: "0.1em 0.5em", fontSize: "0.8rem" }}
        onClick={() => {
          if (window.confirm(`Remove section "${item.sectionName}"? Its songs will merge into the section above.`)) {
            onDelete(item.id);
          }
        }}
        disabled={isOnly}
        title={isOnly ? "Cannot delete the only section" : `Delete section "${item.sectionName}"`}
        aria-label={`Delete section ${item.sectionName}`}
      >
        ✕
      </button>
    </div>
  );
}
