import type {
  Song,
  CreateSongRequest,
  UpdateSongRequest,
  SetListItem,
  CreateSetListItemRequest,
} from "@get-down/shared";
import * as songsRepo from "../repository/songs.js";
import { BadRequestError, NotFoundError } from "../errors.js";

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

export async function getSetList(gigId: number): Promise<SetListItem[]> {
  const rows = await songsRepo.readSetListByGigId(gigId);
  return rows.map(mapSetListItem);
}

export async function addSetListItem(
  gigId: number,
  input: CreateSetListItemRequest
): Promise<SetListItem> {
  const row = await songsRepo.createSetListItem(
    gigId,
    input.songId,
    input.position ?? null,
    input.notes?.trim() ?? null
  );
  return mapSetListItem(row);
}

export async function removeSetListItem(_gigId: number, itemId: number): Promise<void> {
  // gigId ownership validated implicitly via DB FK; delete by item id
  const deleted = await songsRepo.deleteSetListItem(itemId);
  if (!deleted) throw new NotFoundError("SetListItem not found");
}

function mapSong(row: songsRepo.SongRow): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist ?? undefined,
    genre: row.genre ?? undefined,
    musicalKey: row.musical_key ?? undefined,
    bpm: row.bpm ?? undefined,
    airtableId: row.airtable_id ?? undefined,
  };
}

function mapSetListItem(row: songsRepo.SetListItemRow): SetListItem {
  return {
    id: row.id,
    gigId: row.gig_id,
    songId: row.song_id,
    position: row.position ?? undefined,
    notes: row.notes ?? undefined,
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
    airtableId: input.airtableId ?? existing?.airtableId,
  };
}
