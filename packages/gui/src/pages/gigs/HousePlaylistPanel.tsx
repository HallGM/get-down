import type { HousePlaylistSong } from "@get-down/shared";

interface Props {
  songs: HousePlaylistSong[];
  setListSongIds: Set<number>;
  doNotPlayIds: Set<number>;
  onAdd: (songId: number) => void;
  isAdding: boolean;
}

export default function HousePlaylistPanel({
  songs,
  setListSongIds,
  doNotPlayIds,
  onAdd,
  isAdding,
}: Props) {
  return (
    <aside className="house-playlist-panel">
      <details open>
        <summary style={{ cursor: "pointer", marginBottom: "0.5rem" }}>
          <strong>House Playlist</strong>{" "}
          <small style={{ color: "var(--pico-muted-color)" }}>({songs.length})</small>
        </summary>
        <div>
          {songs.length === 0 && (
            <p style={{ color: "var(--pico-muted-color)", fontSize: "0.85rem" }}>
              No songs in the house playlist yet. Add them from the Songs page.
            </p>
          )}
          {songs.map(song => {
            const inSetList = setListSongIds.has(song.songId);
            const isDnp = doNotPlayIds.has(song.songId);
            return (
              <div
                key={song.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.25rem 0.4rem",
                  marginBottom: "0.2rem",
                  borderRadius: "var(--pico-border-radius)",
                  background: inSetList
                    ? "var(--pico-muted-border-color)"
                    : "var(--pico-card-background-color)",
                  border: "1px solid var(--pico-muted-border-color)",
                  opacity: inSetList ? 0.6 : 1,
                }}
              >
                {/* Song info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "12rem",
                      }}
                    >
                      {song.title}
                    </span>
                    {song.vocalType && (
                      <small
                        style={{
                          background: "var(--pico-ins-color)",
                          color: "#fff",
                          padding: "0.05em 0.35em",
                          borderRadius: "0.2em",
                          fontSize: "0.68rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {song.vocalType}
                      </small>
                    )}
                    {isDnp && (
                      <small
                        style={{
                          background: "var(--pico-del-color)",
                          color: "#fff",
                          padding: "0.05em 0.35em",
                          borderRadius: "0.2em",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ⚠ DNP
                      </small>
                    )}
                  </div>
                  {song.artist && (
                    <div style={{ fontSize: "0.75rem", color: "var(--pico-muted-color)" }}>
                      {song.artist}
                      {song.musicalKey && <span> · {song.musicalKey}</span>}
                    </div>
                  )}
                </div>

                {/* Add button */}
                <button
                  onClick={() => onAdd(song.songId)}
                  disabled={inSetList || isAdding}
                  title={inSetList ? "Already in set list" : "Add to set list"}
                  style={{
                    padding: "0.15em 0.5em",
                    fontSize: "0.8rem",
                    flexShrink: 0,
                  }}
                  className={inSetList ? "secondary outline" : "outline"}
                >
                  {inSetList ? "✓" : "+"}
                </button>
              </div>
            );
          })}
        </div>
      </details>
    </aside>
  );
}
