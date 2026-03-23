import type {
  Song,
  CreateSongRequest,
  UpdateSongRequest,
  SetListItemWithSong,
  CreateSetListItemRequest,
  ReorderSetListRequest,
} from "@get-down/shared";
import * as songsRepo from "../repository/songs.js";
import * as prefsRepo from "../repository/gig_song_preferences.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { withTransaction } from "../db/init.js";

export async function getSongs(): Promise<Song[]> {
  const rows = await songsRepo.readSongs();
  return rows.map(mapSong);
}

export async function getSongById(id: number): Promise<Song> {
  const row = await songsRepo.readSongById(id);
  if (!row) throw new NotFoundError("Song not found");
  return mapSong(row);
}

export async function createSong(input: CreateSongRequest): Promise<Song> {
  const row = await songsRepo.createSong(buildSongMutationInput(input));
  return mapSong(row);
}

export async function updateSong(id: number, input: UpdateSongRequest): Promise<Song> {
  const existing = await getSongById(id);
  const row = await songsRepo.updateSong(id, buildSongMutationInput(input, existing));
  if (!row) throw new NotFoundError("Song not found");
  return mapSong(row);
}

export async function deleteSong(id: number): Promise<void> {
  const deleted = await songsRepo.deleteSong(id);
  if (!deleted) throw new NotFoundError("Song not found");
}

export async function getSetList(gigId: number): Promise<SetListItemWithSong[]> {
  const rows = await songsRepo.readSetListByGigId(gigId);
  return rows.map(mapSetListItemWithSong);
}

export async function addSetListItem(
  gigId: number,
  input: CreateSetListItemRequest
): Promise<SetListItemWithSong> {
  await songsRepo.createSetListItem(
    gigId,
    input.songId,
    input.position ?? null,
    input.notes?.trim() ?? null
  );
  // Re-fetch so we get song details + badge flags
  const rows = await songsRepo.readSetListByGigId(gigId);
  const inserted = rows.find(r => r.song_id === input.songId);
  if (!inserted) throw new NotFoundError("SetListItem not found after insert");
  return mapSetListItemWithSong(inserted);
}

export async function removeSetListItem(_gigId: number, itemId: number): Promise<void> {
  const deleted = await songsRepo.deleteSetListItem(itemId);
  if (!deleted) throw new NotFoundError("SetListItem not found");
}

export async function reorderSetList(gigId: number, input: ReorderSetListRequest): Promise<void> {
  if (!Array.isArray(input.itemIds) || input.itemIds.length === 0) return;
  await songsRepo.reorderSetListItems(gigId, input.itemIds);
}

export async function bulkImportFromPreferences(gigId: number): Promise<SetListItemWithSong[]> {
  const [prefs, existingIds] = await Promise.all([
    prefsRepo.readPreferencesByGigId(gigId),
    songsRepo.readSetListSongIds(gigId),
  ]);
  const doNotPlaySet = new Set(prefs.doNotPlays);
  const existingSet = new Set(existingIds);
  // Union favourites + must_plays (deduped), excluding do-not-plays and already added
  const toAdd = [...new Set([...prefs.favourites, ...prefs.mustPlays])].filter(
    id => !doNotPlaySet.has(id) && !existingSet.has(id)
  );
  if (toAdd.length > 0) {
    await withTransaction(async () => {
      for (const songId of toAdd) {
        await songsRepo.createSetListItem(gigId, songId, null, null);
      }
    });
  }
  const rows = await songsRepo.readSetListByGigId(gigId);
  return rows.map(mapSetListItemWithSong);
}

function mapSong(row: songsRepo.SongRow): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist ?? undefined,
    genre: row.genre ?? undefined,
    musicalKey: row.musical_key ?? undefined,
    bpm: row.bpm ?? undefined,
    vocalType: row.vocal_type ?? undefined,
    airtableId: row.airtable_id ?? undefined,
  };
}

function mapSetListItemWithSong(row: songsRepo.SetListItemWithSongRow): SetListItemWithSong {
  return {
    id: row.id,
    gigId: row.gig_id,
    songId: row.song_id,
    position: row.position ?? undefined,
    notes: row.notes ?? undefined,
    title: row.title,
    artist: row.artist ?? undefined,
    musicalKey: row.musical_key ?? undefined,
    vocalType: row.vocal_type ?? undefined,
    isMustPlay: row.is_must_play,
    isFavourite: row.is_favourite,
  };
}

function buildSongMutationInput(
  input: CreateSongRequest | UpdateSongRequest,
  existing?: Song
): songsRepo.SongMutationInput {
  const title = input.title?.trim() ?? existing?.title;
  if (!title) throw new BadRequestError("title is required");
  return {
    title,
    artist: input.artist?.trim() ?? existing?.artist,
    genre: input.genre?.trim() ?? existing?.genre,
    musicalKey: input.musicalKey?.trim() ?? existing?.musicalKey,
    bpm: input.bpm ?? existing?.bpm,
    vocalType: input.vocalType ?? existing?.vocalType,
    airtableId: input.airtableId ?? existing?.airtableId,
  };
}
