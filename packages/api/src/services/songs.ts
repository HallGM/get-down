import type {
  Song,
  CreateSongRequest,
  UpdateSongRequest,
  SetListItemWithSong,
  CreateSetListItemRequest,
  UpdateSetListItemRequest,
  ReorderSetListRequest,
} from "@get-down/shared";
import { z } from "zod";
import * as songsRepo from "../repository/songs.js";
import * as gigsRepo from "../repository/gigs.js";
import * as prefsRepo from "../repository/gig_song_preferences.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { withTransaction } from "../db/init.js";
import { parseOrBadRequest } from "../utils/parse.js";

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

// ─── Add set list item ────────────────────────────────────────────────────────

// Zod schemas for the three add paths
const AddLinkedSchema = z.object({
  songId: z.number().int().positive(),
  position: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const AddUnlinkedSchema = z.object({
  unlinkedTitle: z.string().min(1, "title is required").max(255),
  unlinkedArtist: z.string().max(255).optional(),
  unlinkedKey: z.string().max(50).optional(),
  unlinkedKeyChange: z.string().max(50).optional(),
  unlinkedVocalType: z.string().max(50).optional(),
  unlinkedDuration: z.number().int().nonnegative().optional(),
  position: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const AddSectionSchema = z.object({
  sectionName: z.string().min(1, "sectionName is required").max(255),
});

export async function addSetListItem(
  gigId: number,
  body: unknown
): Promise<SetListItemWithSong> {
  const raw = body as Record<string, unknown>;

  if (raw.sectionName !== undefined) {
    // Section divider path
    const input = parseOrBadRequest(AddSectionSchema, body);
    const inserted = await songsRepo.createSetListItem({
      gigId,
      itemType: "section",
      sectionName: input.sectionName.trim(),
      songId: null,
      position: null,
      notes: null,
      unlinkedTitle: null,
      unlinkedArtist: null,
      unlinkedKey: null,
      unlinkedKeyChange: null,
      unlinkedVocalType: null,
      unlinkedDuration: null,
    });
    const row = await songsRepo.readSetListItemById(inserted.id, gigId);
    if (!row) throw new NotFoundError("SetListItem not found after insert");
    return mapSetListItemWithSong(row);
  } else if (raw.songId !== undefined) {
    // Linked path
    const input = parseOrBadRequest(AddLinkedSchema, body);
    const inserted = await songsRepo.createSetListItem({
      gigId,
      itemType: "song",
      sectionName: null,
      songId: input.songId,
      position: input.position ?? null,
      notes: input.notes?.trim() ?? null,
      unlinkedTitle: null,
      unlinkedArtist: null,
      unlinkedKey: null,
      unlinkedKeyChange: null,
      unlinkedVocalType: null,
      unlinkedDuration: null,
    });
    const row = await songsRepo.readSetListItemById(inserted.id, gigId);
    if (!row) throw new NotFoundError("SetListItem not found after insert");
    return mapSetListItemWithSong(row);
  } else {
    // Unlinked path
    const input = parseOrBadRequest(AddUnlinkedSchema, body);
    const inserted = await songsRepo.createSetListItem({
      gigId,
      itemType: "song",
      sectionName: null,
      songId: null,
      position: input.position ?? null,
      notes: input.notes?.trim() ?? null,
      unlinkedTitle: input.unlinkedTitle.trim(),
      unlinkedArtist: input.unlinkedArtist?.trim() ?? null,
      unlinkedKey: input.unlinkedKey?.trim() ?? null,
      unlinkedKeyChange: input.unlinkedKeyChange?.trim() ?? null,
      unlinkedVocalType: input.unlinkedVocalType?.trim() ?? null,
      unlinkedDuration: input.unlinkedDuration ?? null,
    });
    const row = await songsRepo.readSetListItemById(inserted.id, gigId);
    if (!row) throw new NotFoundError("SetListItem not found after insert");
    return mapSetListItemWithSong(row);
  }
}

export async function removeSetListItem(_gigId: number, itemId: number): Promise<void> {
  const deleted = await songsRepo.deleteSetListItem(itemId);
  if (!deleted) throw new NotFoundError("SetListItem not found");
}

export async function clearSetList(gigId: number): Promise<void> {
  await songsRepo.clearSetList(gigId);
}

export async function bulkDeleteSetListItems(gigId: number, body: unknown): Promise<void> {
  const schema = z.object({ itemIds: z.array(z.number().int().positive()).min(1) });
  const { itemIds } = parseOrBadRequest(schema, body);
  await songsRepo.bulkDeleteSetListItems(gigId, itemIds);
}

export async function reorderSetList(gigId: number, input: ReorderSetListRequest): Promise<void> {
  if (!Array.isArray(input.itemIds) || input.itemIds.length === 0) return;
  await songsRepo.reorderSetListItems(gigId, input.itemIds);
}

// ─── Update set list item ─────────────────────────────────────────────────────

// Fields are optional (absent = don't touch), nullable (null = clear).
// Empty/whitespace strings are normalised to null.
const UpdateSetListItemSchema = z.object({
  sectionName:           z.string().max(255).transform(v => v.trim() || null).nullable().optional(),
  overrideKey:           z.string().max(50).transform(v => v.trim() || null).nullable().optional(),
  overrideKeyChange:     z.string().max(50).transform(v => v.trim() || null).nullable().optional(),
  overrideVocalType:     z.string().max(50).transform(v => v.trim() || null).nullable().optional(),
  overrideDuration:      z.number().int().nonnegative().nullable().optional(),
  unlinkedTitle:         z.string().max(255).transform(v => v.trim() || null).nullable().optional(),
  unlinkedArtist:        z.string().max(255).transform(v => v.trim() || null).nullable().optional(),
  unlinkedKey:           z.string().max(50).transform(v => v.trim() || null).nullable().optional(),
  unlinkedKeyChange:     z.string().max(50).transform(v => v.trim() || null).nullable().optional(),
  unlinkedVocalType:     z.string().max(50).transform(v => v.trim() || null).nullable().optional(),
  unlinkedDuration:      z.number().int().nonnegative().nullable().optional(),
});

export async function updateSetListItem(
  gigId: number,
  itemId: number,
  body: unknown
): Promise<SetListItemWithSong> {
  const input: UpdateSetListItemRequest = parseOrBadRequest(UpdateSetListItemSchema, body);

  const existing = await songsRepo.readSetListItemById(itemId, gigId);
  if (!existing) throw new NotFoundError("SetListItem not found");

  const newSectionName =        input.sectionName         !== undefined ? input.sectionName         : existing.section_name;
  const newKey =                input.overrideKey         !== undefined ? input.overrideKey         : existing.override_key;
  const newKeyChange =          input.overrideKeyChange   !== undefined ? input.overrideKeyChange   : existing.override_key_change;
  const newVocalType =          input.overrideVocalType   !== undefined ? input.overrideVocalType   : existing.override_vocal_type;
  const newOverrideDur =        input.overrideDuration    !== undefined ? input.overrideDuration    : existing.override_duration;
  const newUnlTitle =           input.unlinkedTitle       !== undefined ? input.unlinkedTitle       : existing.unlinked_title;
  const newUnlArtist =          input.unlinkedArtist      !== undefined ? input.unlinkedArtist      : existing.unlinked_artist;
  const newUnlKey =             input.unlinkedKey         !== undefined ? input.unlinkedKey         : existing.unlinked_key;
  const newUnlKeyChange =       input.unlinkedKeyChange   !== undefined ? input.unlinkedKeyChange   : existing.unlinked_key_change;
  const newUnlVocalType =       input.unlinkedVocalType   !== undefined ? input.unlinkedVocalType   : existing.unlinked_vocal_type;
  const newUnlDuration =        input.unlinkedDuration    !== undefined ? input.unlinkedDuration    : existing.unlinked_duration;

  await songsRepo.updateSetListItem(itemId, gigId, {
    sectionName: newSectionName,
    overrideKey: newKey,
    overrideKeyChange: newKeyChange,
    overrideVocalType: newVocalType,
    overrideDuration: newOverrideDur,
    unlinkedTitle: newUnlTitle,
    unlinkedArtist: newUnlArtist,
    unlinkedKey: newUnlKey,
    unlinkedKeyChange: newUnlKeyChange,
    unlinkedVocalType: newUnlVocalType,
    unlinkedDuration: newUnlDuration,
  });

  const updated = await songsRepo.readSetListItemById(itemId, gigId);
  if (!updated) throw new NotFoundError("SetListItem not found after update");
  return mapSetListItemWithSong(updated);
}

// ─── Bulk import from preferences ────────────────────────────────────────────

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
        await songsRepo.createSetListItem({
          gigId,
          itemType: "song",
          sectionName: null,
          songId,
          position: null,
          notes: null,
          unlinkedTitle: null,
          unlinkedArtist: null,
          unlinkedKey: null,
          unlinkedKeyChange: null,
          unlinkedVocalType: null,
          unlinkedDuration: null,
        });
      }
    });
  }
  const rows = await songsRepo.readSetListByGigId(gigId);
  return rows.map(mapSetListItemWithSong);
}

// ─── Auto-order ───────────────────────────────────────────────────────────────

export async function autoOrderSetList(gigId: number): Promise<SetListItemWithSong[]> {
  const items = await songsRepo.readSetListByGigId(gigId);
  if (items.length === 0) return [];

  // Split the flat list into sections. Each section is { header, songs }.
  // Songs before the first header go into an implicit group with no header.
  type SectionGroup = {
    header: songsRepo.SetListItemWithSongRow | null;
    songs: songsRepo.SetListItemWithSongRow[];
  };

  const sections: SectionGroup[] = [];
  let current: SectionGroup = { header: null, songs: [] };

  for (const item of items) {
    if (item.item_type === "section") {
      sections.push(current);
      current = { header: item, songs: [] };
    } else {
      current.songs.push(item);
    }
  }
  sections.push(current);

  // Auto-order helpers (same logic as before)
  function effectiveVocalType(row: songsRepo.SetListItemWithSongRow): string | null {
    return row.override_vocal_type ?? row.vocal_type ?? row.unlinked_vocal_type ?? null;
  }
  const isMale   = (row: songsRepo.SetListItemWithSongRow) => {
    const v = (effectiveVocalType(row) ?? "").toLowerCase().trim();
    return v === "m" || v === "male" || v.startsWith("male");
  };
  const isFemale = (row: songsRepo.SetListItemWithSongRow) => {
    const v = (effectiveVocalType(row) ?? "").toLowerCase().trim();
    return v === "f" || v === "female" || v.startsWith("female");
  };
  const isTyped  = (row: songsRepo.SetListItemWithSongRow) => isMale(row) || isFemale(row);

  function autoOrderSongs(songItems: songsRepo.SetListItemWithSongRow[]): songsRepo.SetListItemWithSongRow[] {
    if (songItems.length === 0) return [];

    const males   = songItems.filter(isMale);
    const females = songItems.filter(isFemale);
    const untyped = songItems.filter(r => !isTyped(r));

    const typed: songsRepo.SetListItemWithSongRow[] = [];
    const mQueue = [...males];
    const fQueue = [...females];
    while (mQueue.length > 0 || fQueue.length > 0) {
      if (mQueue.length > 0) typed.push(mQueue.shift()!);
      if (fQueue.length > 0) typed.push(fQueue.shift()!);
    }

    const typedMustPlays   = typed.filter(r => r.is_must_play);
    const typedNonMust     = typed.filter(r => !r.is_must_play);
    const untypedMustPlays = untyped.filter(r => r.is_must_play);
    const untypedNonMust   = untyped.filter(r => !r.is_must_play);

    let finalTyped: songsRepo.SetListItemWithSongRow[];
    if (typedMustPlays.length === 0) {
      finalTyped = typed;
    } else {
      const total = typed.length;
      const mCount = typedMustPlays.length;
      const targetPositions = typedMustPlays.map((_, i) =>
        Math.round(i * (total - 1) / Math.max(mCount - 1, 1))
      );
      const base = [...typedNonMust];
      const result: (songsRepo.SetListItemWithSongRow | null)[] = new Array(total).fill(null);
      for (let i = 0; i < typedMustPlays.length; i++) {
        result[targetPositions[i]] = typedMustPlays[i];
      }
      let baseIdx = 0;
      for (let i = 0; i < result.length; i++) {
        if (result[i] === null) result[i] = base[baseIdx++];
      }
      finalTyped = result.filter(Boolean) as songsRepo.SetListItemWithSongRow[];
    }

    return [...finalTyped, ...untypedMustPlays, ...untypedNonMust];
  }

  // Reconstruct a flat ordered ID list: [header?, ...songs, header?, ...songs]
  const orderedIds: number[] = [];
  for (const section of sections) {
    if (section.header) orderedIds.push(section.header.id);
    const reordered = autoOrderSongs(section.songs);
    for (const s of reordered) orderedIds.push(s.id);
  }

  if (orderedIds.length > 0) {
    await songsRepo.reorderSetListItems(gigId, orderedIds);
  }

  return getSetList(gigId);
}

// ─── PDF payload ──────────────────────────────────────────────────────────────

export async function buildSetListPdfPayload(gigId: number): Promise<Record<string, unknown>> {
  const [gig, items] = await Promise.all([
    gigsRepo.readGigById(gigId),
    songsRepo.readSetListByGigId(gigId),
  ]);
  if (!gig) throw new NotFoundError("Gig not found");

  const clientName = gig.partner_name
    ? `${gig.first_name} ${gig.last_name} & ${gig.partner_name}`
    : `${gig.first_name} ${gig.last_name}`;

  const eventDate = gig.date
    ? new Date(gig.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";

  // Group items into sections (flat list split at 'section' rows)
  type PdfSong = {
    title: string;
    artist: string | null;
    key: string | null;
    key_change: string | null;
    vocal_type: string | null;
    duration: number | null;
    is_must_play: boolean;
  };
  type PdfSection = { name: string; songs: PdfSong[]; duration_seconds: number };

  const sections: PdfSection[] = [];
  let currentSection: PdfSection = { name: "Set 1", songs: [], duration_seconds: 0 };

  for (const r of items) {
    if (r.item_type === "section") {
      if (currentSection.songs.length > 0 || sections.length > 0) {
        // Only push if it already has content or there's already something
        sections.push(currentSection);
      }
      currentSection = { name: r.section_name ?? "Set 1", songs: [], duration_seconds: 0 };
    } else {
      const dur = r.override_duration ?? r.duration ?? r.unlinked_duration ?? null;
      currentSection.songs.push({
        title: r.title,
        artist: r.artist ?? null,
        key: r.override_key ?? r.musical_key ?? r.unlinked_key ?? null,
        key_change: r.override_key_change ?? r.key_change ?? r.unlinked_key_change ?? null,
        vocal_type: r.override_vocal_type ?? r.vocal_type ?? r.unlinked_vocal_type ?? null,
        duration: dur,
        is_must_play: r.is_must_play,
      });
      currentSection.duration_seconds += dur ?? 0;
    }
  }
  // Push the last active section (even if songs.length === 0 to handle empty sets)
  sections.push(currentSection);

  return {
    client_name: clientName,
    event_date: eventDate,
    venue: gig.venue_name ?? null,
    sections,
  };
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapSong(row: songsRepo.SongRow): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist ?? undefined,
    genre: row.genre_name ?? undefined,
    genreId: row.genre_id ?? undefined,
    musicalKey: row.musical_key ?? undefined,
    keyChange: row.key_change ?? undefined,
    bpm: row.bpm ?? undefined,
    vocalType: row.vocal_type ?? undefined,
    airtableId: row.airtable_id ?? undefined,
    duration: row.duration ?? undefined,
  };
}

function mapSetListItemWithSong(row: songsRepo.SetListItemWithSongRow): SetListItemWithSong {
  return {
    id: row.id,
    gigId: row.gig_id,
    itemType: row.item_type === "section" ? "section" : "song",
    sectionName: row.section_name ?? undefined,
    songId: row.song_id ?? undefined,
    position: row.position ?? undefined,
    notes: row.notes ?? undefined,
    overrideKey: row.override_key ?? undefined,
    overrideKeyChange: row.override_key_change ?? undefined,
    overrideVocalType: row.override_vocal_type ?? undefined,
    overrideDuration: row.override_duration ?? undefined,
    unlinkedTitle: row.unlinked_title ?? undefined,
    unlinkedArtist: row.unlinked_artist ?? undefined,
    unlinkedKey: row.unlinked_key ?? undefined,
    unlinkedKeyChange: row.unlinked_key_change ?? undefined,
    unlinkedVocalType: row.unlinked_vocal_type ?? undefined,
    unlinkedDuration: row.unlinked_duration ?? undefined,
    title: row.title,
    artist: row.artist ?? undefined,
    musicalKey: row.musical_key ?? undefined,
    keyChange: row.key_change ?? undefined,
    vocalType: row.vocal_type ?? undefined,
    duration: row.duration ?? undefined,
    isMustPlay: row.is_must_play,
    isFavourite: row.is_favourite,
    isDoNotPlay: row.is_do_not_play,
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
    genreId: input.genreId ?? existing?.genreId,
    musicalKey: input.musicalKey?.trim() ?? existing?.musicalKey,
    keyChange: input.keyChange?.trim() ?? existing?.keyChange,
    bpm: input.bpm ?? existing?.bpm,
    vocalType: input.vocalType ?? existing?.vocalType,
    airtableId: input.airtableId ?? existing?.airtableId,
    duration: input.duration ?? existing?.duration,
  };
}
