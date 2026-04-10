import { run_query } from "../db/init.js";
import { NotFoundError } from "../errors.js";
import type { HousePlaylistSong } from "@get-down/shared";

export interface HousePlaylistRow {
  id: number;
  song_id: number;
  title: string;
  artist: string | null;
  musical_key: string | null;
  vocal_type: string | null;
}

export async function readHousePlaylist(): Promise<HousePlaylistRow[]> {
  return run_query<HousePlaylistRow>({
    text: `
      SELECT hp.id, hp.song_id, s.title, s.artist, s.musical_key, s.vocal_type
      FROM house_playlist_songs hp
      JOIN songs s ON s.id = hp.song_id
      ORDER BY s.title;
    `,
  });
}

export async function addToHousePlaylist(songId: number): Promise<HousePlaylistRow> {
  const rows = await run_query<HousePlaylistRow>({
    text: `
      INSERT INTO house_playlist_songs (song_id)
      VALUES ($1)
      ON CONFLICT (song_id) DO NOTHING
      RETURNING id, song_id;
    `,
    values: [songId],
  });
  // If it was already in the list, re-fetch the row
  const inserted = rows[0];
  if (inserted) {
    const full = await run_query<HousePlaylistRow>({
      text: `
        SELECT hp.id, hp.song_id, s.title, s.artist, s.musical_key, s.vocal_type
        FROM house_playlist_songs hp
        JOIN songs s ON s.id = hp.song_id
        WHERE hp.id = $1;
      `,
      values: [inserted.id],
    });
    if (!full[0]) throw new NotFoundError("House playlist entry not found after insert");
    return full[0];
  }
  // Already existed — return the existing row
  const existing = await run_query<HousePlaylistRow>({
    text: `
      SELECT hp.id, hp.song_id, s.title, s.artist, s.musical_key, s.vocal_type
      FROM house_playlist_songs hp
      JOIN songs s ON s.id = hp.song_id
      WHERE hp.song_id = $1;
    `,
    values: [songId],
  });
  if (!existing[0]) throw new NotFoundError("House playlist entry not found");
  return existing[0];
}

export async function removeFromHousePlaylist(songId: number): Promise<boolean> {
  const rows = await run_query<{ song_id: number }>({
    text: `DELETE FROM house_playlist_songs WHERE song_id = $1 RETURNING song_id;`,
    values: [songId],
  });
  return rows.length > 0;
}

export function mapHousePlaylistRow(row: HousePlaylistRow): HousePlaylistSong {
  return {
    id: row.id,
    songId: row.song_id,
    title: row.title,
    artist: row.artist ?? undefined,
    musicalKey: row.musical_key ?? undefined,
    vocalType: row.vocal_type ?? undefined,
  };
}
