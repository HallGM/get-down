import type { HousePlaylistSong } from "@get-down/shared";
import * as repo from "../repository/house_playlist.js";
import { NotFoundError } from "../errors.js";
import * as songsRepo from "../repository/songs.js";

export async function getHousePlaylist(): Promise<HousePlaylistSong[]> {
  const rows = await repo.readHousePlaylist();
  return rows.map(repo.mapHousePlaylistRow);
}

export async function addToHousePlaylist(songId: number): Promise<HousePlaylistSong> {
  // Verify the song exists
  const song = await songsRepo.readSongById(songId);
  if (!song) throw new NotFoundError("Song not found");
  const row = await repo.addToHousePlaylist(songId);
  return repo.mapHousePlaylistRow(row);
}

export async function removeFromHousePlaylist(songId: number): Promise<void> {
  const removed = await repo.removeFromHousePlaylist(songId);
  if (!removed) throw new NotFoundError("Song not found in house playlist");
}
