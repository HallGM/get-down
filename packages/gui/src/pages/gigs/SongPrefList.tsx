import { useState } from "react";
import type { Song } from "@get-down/shared";

interface Props {
  label: string;
  ids: number[];
  songs: Song[];
  readOnly?: boolean;
  onChange?: (ids: number[]) => void;
}

export default function SongPrefList({ label, ids, songs, readOnly = false, onChange }: Props) {
  const [search, setSearch] = useState("");
  const idSet = new Set(ids);
  const selected = songs.filter(s => idSet.has(s.id));
  const filtered = songs.filter(
    s => !idSet.has(s.id) && (
      search === "" ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.artist ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <details style={{ marginBottom: "0.75rem" }}>
      <summary style={{ cursor: "pointer" }}>
        <strong>{label}</strong>{" "}
        <small style={{ color: "var(--pico-muted-color)" }}>({ids.length})</small>
      </summary>
      <div style={{ marginTop: "0.5rem" }}>
        {selected.length === 0 && (
          <p style={{ color: "var(--pico-muted-color)", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>None</p>
        )}
        {selected.map(s => (
          <div
            key={s.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.2rem 0.4rem",
              marginBottom: "0.15rem",
              background: "var(--pico-card-background-color)",
              border: "1px solid var(--pico-muted-border-color)",
              borderRadius: "var(--pico-border-radius)",
            }}
          >
            <span>
              {s.title}
              {s.artist && <small style={{ color: "var(--pico-muted-color)" }}> · {s.artist}</small>}
            </span>
            {!readOnly && (
              <button
                className="secondary outline"
                style={{ padding: "0 0.4em", fontSize: "0.8rem" }}
                onClick={() => onChange?.(ids.filter(id => id !== s.id))}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <>
            <input
              type="search"
              placeholder="Search to add songs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}
            />
            {search && filtered.slice(0, 8).map(s => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer", padding: "0.2rem 0.4rem", borderRadius: "var(--pico-border-radius)" }}
                onClick={() => { onChange?.([...ids, s.id]); setSearch(""); }}
                onKeyDown={e => { if (e.key === "Enter") { onChange?.([...ids, s.id]); setSearch(""); } }}
              >
                {s.title}{s.artist && <small style={{ color: "var(--pico-muted-color)" }}> · {s.artist}</small>}
              </div>
            ))}
          </>
        )}
      </div>
    </details>
  );
}
