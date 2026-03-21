import { run_query } from "../db/init.js";

export interface SongRow {
  id: number;
  title: string;
  artist: string | null;
  genre: string | null;
  musical_key: string | null;
  bpm: number | null;
  airtable_id: string | null;
}

export interface SongMutationInput {
  title: string;
  artist?: string;
  genre?: string;
  musicalKey?: string;
  bpm?: number;
  airtableId?: string;
}

export async function createSong(input: SongMutationInput): Promise<SongRow> {
  const rows = await run_query<SongRow>({
    text: `
      INSERT INTO songs (title, artist, genre, musical_key, bpm, airtable_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, artist, genre, musical_key, bpm, airtable_id;
    `,
    values: [
      input.title,
      input.artist ?? null,
      input.genre ?? null,
      input.musicalKey ?? null,
      input.bpm ?? null,
      input.airtableId ?? null,
    ],
  });
  return rows[0];
}

export async function readSongs(): Promise<SongRow[]> {
  return run_query<SongRow>({
    text: `SELECT id, title, artist, genre, musical_key, bpm, airtable_id FROM songs ORDER BY title;`,
  });
}

export async function readSongById(id: number): Promise<SongRow | null> {
  const rows = await run_query<SongRow>({
    text: `SELECT id, title, artist, genre, musical_key, bpm, airtable_id FROM songs WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateSong(id: number, input: SongMutationInput): Promise<SongRow | null> {
  const rows = await run_query<SongRow>({
    text: `
      UPDATE songs
      SET title = $1, artist = $2, genre = $3, musical_key = $4, bpm = $5, airtable_id = $6
      WHERE id = $7
      RETURNING id, title, artist, genre, musical_key, bpm, airtable_id;
    `,
    values: [
      input.title,
      input.artist ?? null,
      input.genre ?? null,
      input.musicalKey ?? null,
      input.bpm ?? null,
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
}

export async function readSetListByGigId(gigId: number): Promise<SetListItemRow[]> {
  return run_query<SetListItemRow>({
    text: `SELECT id, gig_id, song_id, position, notes FROM set_list_items WHERE gig_id = $1 ORDER BY position, id;`,
    values: [gigId],
  });
}

export async function createSetListItem(
  gigId: number,
  songId: number,
  position: number | null,
  notes: string | null
): Promise<SetListItemRow> {
  const rows = await run_query<SetListItemRow>({
    text: `INSERT INTO set_list_items (gig_id, song_id, position, notes) VALUES ($1, $2, $3, $4) RETURNING id, gig_id, song_id, position, notes;`,
    values: [gigId, songId, position, notes],
  });
  return rows[0];
}

export async function deleteSetListItem(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM set_list_items WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
