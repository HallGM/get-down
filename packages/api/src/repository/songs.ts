import { run_query } from "../db/init.js";

export interface SongRow {
  id: number;
  title: string;
  artist: string | null;
  genre_id: number | null;
  genre_name: string | null;
  musical_key: string | null;
  key_change: string | null;
  bpm: number | null;
  vocal_type: string | null;
  airtable_id: string | null;
  duration: number | null;
}

export interface SongMutationInput {
  title: string;
  artist?: string;
  genreId?: number;
  musicalKey?: string;
  keyChange?: string;
  bpm?: number;
  vocalType?: string;
  airtableId?: string;
  duration?: number;
}

export async function createSong(input: SongMutationInput): Promise<SongRow> {
  const rows = await run_query<SongRow>({
    text: `
      INSERT INTO songs (title, artist, genre_id, musical_key, key_change, bpm, vocal_type, airtable_id, duration)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, title, artist, genre_id, musical_key, key_change, bpm, vocal_type, airtable_id, duration, NULL AS genre_name;
    `,
    values: [
      input.title,
      input.artist ?? null,
      input.genreId ?? null,
      input.musicalKey ?? null,
      input.keyChange ?? null,
      input.bpm ?? null,
      input.vocalType ?? null,
      input.airtableId ?? null,
      input.duration ?? null,
    ],
  });
  return rows[0];
}

const SONG_SELECT = `
  SELECT s.id, s.title, s.artist, s.genre_id, g.name AS genre_name,
         s.musical_key, s.key_change, s.bpm, s.vocal_type, s.airtable_id, s.duration
  FROM songs s
  LEFT JOIN genres g ON g.id = s.genre_id
`;

export async function readSongs(): Promise<SongRow[]> {
  return run_query<SongRow>({
    text: `${SONG_SELECT} ORDER BY s.title;`,
  });
}

export async function readSongById(id: number): Promise<SongRow | null> {
  const rows = await run_query<SongRow>({
    text: `${SONG_SELECT} WHERE s.id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateSong(id: number, input: SongMutationInput): Promise<SongRow | null> {
  const rows = await run_query<SongRow>({
    text: `
      UPDATE songs
      SET title = $1, artist = $2, genre_id = $3, musical_key = $4, key_change = $5, bpm = $6, vocal_type = $7, airtable_id = $8, duration = $9
      WHERE id = $10
      RETURNING id, title, artist, genre_id, musical_key, key_change, bpm, vocal_type, airtable_id, duration, NULL AS genre_name;
    `,
    values: [
      input.title,
      input.artist ?? null,
      input.genreId ?? null,
      input.musicalKey ?? null,
      input.keyChange ?? null,
      input.bpm ?? null,
      input.vocalType ?? null,
      input.airtableId ?? null,
      input.duration ?? null,
      id,
    ],
  });
  if (!rows[0]) return null;
  // Re-fetch with genre join so genre_name is populated
  return readSongById(id);
}

export async function deleteSong(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM songs WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

export async function readSongsByIds(ids: number[]): Promise<SongRow[]> {
  if (ids.length === 0) return [];
  return run_query<SongRow>({
    text: `${SONG_SELECT} WHERE s.id = ANY($1::int[]);`,
    values: [ids],
  });
}

// ─── Set list items ───────────────────────────────────────────────────────────

export interface SetListItemRow {
  id: number;
  gig_id: number;
  song_id: number | null;
  position: number | null;
  notes: string | null;
  override_key: string | null;
  override_key_change: string | null;
  override_vocal_type: string | null;
  override_duration: number | null;
  unlinked_title: string | null;
  unlinked_artist: string | null;
  unlinked_key: string | null;
  unlinked_key_change: string | null;
  unlinked_vocal_type: string | null;
  unlinked_duration: number | null;
}

export interface SetListItemWithSongRow extends SetListItemRow {
  title: string;
  artist: string | null;
  musical_key: string | null;
  key_change: string | null;
  vocal_type: string | null;
  duration: number | null;
  is_must_play: boolean;
  is_favourite: boolean;
  is_do_not_play: boolean;
}

const SET_LIST_SELECT = `
  SELECT
    sli.id, sli.gig_id, sli.song_id, sli.position, sli.notes,
    sli.override_key, sli.override_key_change, sli.override_vocal_type, sli.override_duration,
    sli.unlinked_title, sli.unlinked_artist, sli.unlinked_key, sli.unlinked_key_change, sli.unlinked_vocal_type, sli.unlinked_duration,
    COALESCE(s.title, sli.unlinked_title, '') AS title,
    COALESCE(s.artist, sli.unlinked_artist)  AS artist,
    s.musical_key,
    s.key_change,
    COALESCE(s.vocal_type, sli.unlinked_vocal_type) AS vocal_type,
    COALESCE(sli.override_duration, s.duration, sli.unlinked_duration) AS duration,
    EXISTS (SELECT 1 FROM gig_song_must_plays mp  WHERE mp.gig_id  = sli.gig_id AND mp.song_id  = sli.song_id) AS is_must_play,
    EXISTS (SELECT 1 FROM gig_song_favourites fav WHERE fav.gig_id = sli.gig_id AND fav.song_id = sli.song_id) AS is_favourite,
    EXISTS (SELECT 1 FROM gig_song_do_not_plays dnp WHERE dnp.gig_id = sli.gig_id AND dnp.song_id = sli.song_id) AS is_do_not_play
  FROM set_list_items sli
  LEFT JOIN songs s ON s.id = sli.song_id
`;

export async function readSetListByGigId(gigId: number): Promise<SetListItemWithSongRow[]> {
  return run_query<SetListItemWithSongRow>({
    text: `${SET_LIST_SELECT} WHERE sli.gig_id = $1 ORDER BY sli.position, sli.id;`,
    values: [gigId],
  });
}

export async function readSetListItemById(
  itemId: number,
  gigId: number
): Promise<SetListItemWithSongRow | null> {
  const rows = await run_query<SetListItemWithSongRow>({
    text: `${SET_LIST_SELECT} WHERE sli.id = $1 AND sli.gig_id = $2 LIMIT 1;`,
    values: [itemId, gigId],
  });
  return rows[0] ?? null;
}

export interface CreateSetListItemInput {
  gigId: number;
  songId: number | null;
  position: number | null;
  notes: string | null;
  unlinkedTitle: string | null;
  unlinkedArtist: string | null;
  unlinkedKey: string | null;
  unlinkedKeyChange: string | null;
  unlinkedVocalType: string | null;
  unlinkedDuration: number | null;
}

export async function createSetListItem(input: CreateSetListItemInput): Promise<SetListItemRow> {
  const rows = await run_query<SetListItemRow>({
    text: `
      INSERT INTO set_list_items
        (gig_id, song_id, position, notes, unlinked_title, unlinked_artist, unlinked_key, unlinked_key_change, unlinked_vocal_type, unlinked_duration)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, gig_id, song_id, position, notes, override_key, override_key_change, override_vocal_type, override_duration,
                unlinked_title, unlinked_artist, unlinked_key, unlinked_key_change, unlinked_vocal_type, unlinked_duration;
    `,
    values: [
      input.gigId,
      input.songId,
      input.position,
      input.notes,
      input.unlinkedTitle,
      input.unlinkedArtist,
      input.unlinkedKey,
      input.unlinkedKeyChange,
      input.unlinkedVocalType,
      input.unlinkedDuration,
    ],
  });
  return rows[0];
}

export interface UpdateSetListItemInput {
  overrideKey: string | null;
  overrideKeyChange: string | null;
  overrideVocalType: string | null;
  overrideDuration: number | null;
  unlinkedTitle: string | null;
  unlinkedArtist: string | null;
  unlinkedKey: string | null;
  unlinkedKeyChange: string | null;
  unlinkedVocalType: string | null;
  unlinkedDuration: number | null;
}

export async function updateSetListItem(
  itemId: number,
  gigId: number,
  input: UpdateSetListItemInput
): Promise<SetListItemRow | null> {
  const rows = await run_query<SetListItemRow>({
    text: `
      UPDATE set_list_items
      SET override_key = $1, override_key_change = $2, override_vocal_type = $3, override_duration = $4,
          unlinked_title = $5, unlinked_artist = $6, unlinked_key = $7, unlinked_key_change = $8,
          unlinked_vocal_type = $9, unlinked_duration = $10
      WHERE id = $11 AND gig_id = $12
      RETURNING id, gig_id, song_id, position, notes, override_key, override_key_change, override_vocal_type, override_duration,
                unlinked_title, unlinked_artist, unlinked_key, unlinked_key_change, unlinked_vocal_type, unlinked_duration;
    `,
    values: [
      input.overrideKey,
      input.overrideKeyChange,
      input.overrideVocalType,
      input.overrideDuration,
      input.unlinkedTitle,
      input.unlinkedArtist,
      input.unlinkedKey,
      input.unlinkedKeyChange,
      input.unlinkedVocalType,
      input.unlinkedDuration,
      itemId,
      gigId,
    ],
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

export async function clearSetList(gigId: number): Promise<void> {
  await run_query({
    text: `DELETE FROM set_list_items WHERE gig_id = $1;`,
    values: [gigId],
  });
}

export async function bulkDeleteSetListItems(gigId: number, itemIds: number[]): Promise<void> {
  if (itemIds.length === 0) return;
  await run_query({
    text: `DELETE FROM set_list_items WHERE gig_id = $1 AND id = ANY($2::int[]);`,
    values: [gigId, itemIds],
  });
}

export async function reorderSetListItems(gigId: number, itemIds: number[]): Promise<void> {
  // Use WITH ORDINALITY to safely zip item IDs with their 1-based positions
  await run_query({
    text: `
      UPDATE set_list_items AS sli
      SET position = ord.pos
      FROM (
        SELECT id, ordinality::int AS pos
        FROM unnest($1::int[]) WITH ORDINALITY AS u(id, ordinality)
      ) AS ord
      WHERE sli.id = ord.id AND sli.gig_id = $2;
    `,
    values: [itemIds, gigId],
  });
}

export async function readSetListSongIds(gigId: number): Promise<number[]> {
  const rows = await run_query<{ song_id: number }>({
    text: `SELECT song_id FROM set_list_items WHERE gig_id = $1 AND song_id IS NOT NULL;`,
    values: [gigId],
  });
  return rows.map(r => r.song_id);
}
