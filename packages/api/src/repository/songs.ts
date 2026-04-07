import { run_query } from "../db/init.js";

export interface SongRow {
  id: number;
  title: string;
  artist: string | null;
  genre: string | null;
  musical_key: string | null;
  bpm: number | null;
  vocal_type: string | null;
  airtable_id: string | null;
}

export interface SongMutationInput {
  title: string;
  artist?: string;
  genre?: string;
  musicalKey?: string;
  bpm?: number;
  vocalType?: string;
  airtableId?: string;
}

export async function createSong(input: SongMutationInput): Promise<SongRow> {
  const rows = await run_query<SongRow>({
    text: `
      INSERT INTO songs (title, artist, genre, musical_key, bpm, vocal_type, airtable_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, artist, genre, musical_key, bpm, vocal_type, airtable_id;
    `,
    values: [
      input.title,
      input.artist ?? null,
      input.genre ?? null,
      input.musicalKey ?? null,
      input.bpm ?? null,
      input.vocalType ?? null,
      input.airtableId ?? null,
    ],
  });
  return rows[0];
}

export async function readSongs(): Promise<SongRow[]> {
  return run_query<SongRow>({
    text: `SELECT id, title, artist, genre, musical_key, bpm, vocal_type, airtable_id FROM songs ORDER BY title;`,
  });
}

export async function readSongById(id: number): Promise<SongRow | null> {
  const rows = await run_query<SongRow>({
    text: `SELECT id, title, artist, genre, musical_key, bpm, vocal_type, airtable_id FROM songs WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateSong(id: number, input: SongMutationInput): Promise<SongRow | null> {
  const rows = await run_query<SongRow>({
    text: `
      UPDATE songs
      SET title = $1, artist = $2, genre = $3, musical_key = $4, bpm = $5, vocal_type = $6, airtable_id = $7
      WHERE id = $8
      RETURNING id, title, artist, genre, musical_key, bpm, vocal_type, airtable_id;
    `,
    values: [
      input.title,
      input.artist ?? null,
      input.genre ?? null,
      input.musicalKey ?? null,
      input.bpm ?? null,
      input.vocalType ?? null,
      input.airtableId ?? null,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function deleteSong(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM songs WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

// Set list items

export interface SetListItemRow {
  id: number;
  gig_id: number;
  song_id: number;
  position: number | null;
  notes: string | null;
  override_key: string | null;
  override_vocal_type: string | null;
}

export interface SetListItemWithSongRow extends SetListItemRow {
  title: string;
  artist: string | null;
  musical_key: string | null;
  vocal_type: string | null;
  is_must_play: boolean;
  is_favourite: boolean;
}

export async function readSetListByGigId(gigId: number): Promise<SetListItemWithSongRow[]> {
  return run_query<SetListItemWithSongRow>({
    text: `
      SELECT
        sli.id, sli.gig_id, sli.song_id, sli.position, sli.notes,
        sli.override_key, sli.override_vocal_type,
        s.title, s.artist, s.musical_key, s.vocal_type,
        EXISTS (SELECT 1 FROM gig_song_must_plays mp WHERE mp.gig_id = sli.gig_id AND mp.song_id = sli.song_id) AS is_must_play,
        EXISTS (SELECT 1 FROM gig_song_favourites fav WHERE fav.gig_id = sli.gig_id AND fav.song_id = sli.song_id) AS is_favourite
      FROM set_list_items sli
      JOIN songs s ON s.id = sli.song_id
      WHERE sli.gig_id = $1
      ORDER BY sli.position, sli.id;
    `,
    values: [gigId],
  });
}

export async function readSetListItemById(
  itemId: number,
  gigId: number
): Promise<SetListItemWithSongRow | null> {
  const rows = await run_query<SetListItemWithSongRow>({
    text: `
      SELECT
        sli.id, sli.gig_id, sli.song_id, sli.position, sli.notes,
        sli.override_key, sli.override_vocal_type,
        s.title, s.artist, s.musical_key, s.vocal_type,
        EXISTS (SELECT 1 FROM gig_song_must_plays mp WHERE mp.gig_id = sli.gig_id AND mp.song_id = sli.song_id) AS is_must_play,
        EXISTS (SELECT 1 FROM gig_song_favourites fav WHERE fav.gig_id = sli.gig_id AND fav.song_id = sli.song_id) AS is_favourite
      FROM set_list_items sli
      JOIN songs s ON s.id = sli.song_id
      WHERE sli.id = $1 AND sli.gig_id = $2
      LIMIT 1;
    `,
    values: [itemId, gigId],
  });
  return rows[0] ?? null;
}

export async function createSetListItem(
  gigId: number,
  songId: number,
  position: number | null,
  notes: string | null
): Promise<SetListItemRow> {
  const rows = await run_query<SetListItemRow>({
    text: `INSERT INTO set_list_items (gig_id, song_id, position, notes) VALUES ($1, $2, $3, $4) RETURNING id, gig_id, song_id, position, notes, override_key, override_vocal_type;`,
    values: [gigId, songId, position, notes],
  });
  return rows[0];
}

export async function updateSetListItem(
  itemId: number,
  gigId: number,
  overrideKey: string | null,
  overrideVocalType: string | null
): Promise<SetListItemRow | null> {
  const rows = await run_query<SetListItemRow>({
    text: `
      UPDATE set_list_items
      SET override_key = $1, override_vocal_type = $2
      WHERE id = $3 AND gig_id = $4
      RETURNING id, gig_id, song_id, position, notes, override_key, override_vocal_type;
    `,
    values: [overrideKey, overrideVocalType, itemId, gigId],
  });
  return rows[0] ?? null;
}

export async function deleteSetListItem(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM set_list_items WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

export async function reorderSetListItems(gigId: number, itemIds: number[]): Promise<void> {
  // Update positions in a single query using unnest
  await run_query({
    text: `
      UPDATE set_list_items AS sli
      SET position = ord.pos
      FROM (SELECT unnest($1::int[]) AS id, generate_series(1, $2) AS pos) AS ord
      WHERE sli.id = ord.id AND sli.gig_id = $3;
    `,
    values: [itemIds, itemIds.length, gigId],
  });
}

export async function readSetListSongIds(gigId: number): Promise<number[]> {
  const rows = await run_query<{ song_id: number }>({
    text: `SELECT song_id FROM set_list_items WHERE gig_id = $1;`,
    values: [gigId],
  });
  return rows.map(r => r.song_id);
}
