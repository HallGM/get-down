import type { ClientFormResponse, ClientFormSongGroup, SaveClientFormRequest } from "@get-down/shared";
import { z } from "zod";
import * as gigsRepo from "../repository/gigs.js";
import * as prefsRepo from "../repository/gig_song_preferences.js";
import * as songsRepo from "../repository/songs.js";
import { NotFoundError, BadRequestError } from "../errors.js";
import { withTransaction } from "../db/init.js";
import { parseOrBadRequest } from "../utils/parse.js";

// Canonical genre display order matching the original Fillout form.
const GENRE_ORDER = [
  "Pop",
  "R&B/Hip Hop",
  "Dance",
  "Funk/Motown",
  "Disco",
  "Pop Punk/Emo",
  "Country",
  "Soul",
  "Classics",
  "Reggae/Ska",
  "Scottish",
  "Garage",
  "Rock",
];

const SaveClientFormSchema = z.object({
  venueName:       z.string().optional(),
  location:        z.string().optional(),
  timings:         z.string().optional(),
  contactNumber:   z.string().optional(),
  parkingInfo:     z.string().optional(),
  mealDetails:     z.string().optional(),
  clientNotes:     z.string().optional(),
  playlistUrl:     z.string().optional(),
  endOfNightSong:  z.string().optional(),
  firstDanceSong:  z.string().optional(),
  firstDanceType:  z.string().optional(),
  ceilidh:         z.boolean().optional(),
  ceilidhLength:   z.string().optional(),
  ceilidhStyle:    z.string().optional(),
  preferences: z.object({
    favourites:  z.array(z.number().int().positive()).default([]),
    mustPlays:   z.array(z.number().int().positive()).max(3, "Maximum 3 must-play songs allowed").default([]),
    doNotPlays:  z.array(z.number().int().positive()).default([]),
  }).default({ favourites: [], mustPlays: [], doNotPlays: [] }),
});

export async function getClientForm(token: string): Promise<ClientFormResponse> {
  const gig = await gigsRepo.readGigByClientToken(token);
  if (!gig) throw new NotFoundError("Form not found");

  const [prefs, allSongs, services] = await Promise.all([
    prefsRepo.readPreferencesByGigId(gig.id),
    songsRepo.readSongs(),
    gigsRepo.readGigServicesByGigId(gig.id),
  ]);

  // Group songs by genre, preserving the canonical Fillout order.
  const genreMap = new Map<string, { id: number; title: string; artist?: string }[]>();
  for (const song of allSongs) {
    if (!song.active) continue;
    const genre = song.genre_name ?? "Other";
    if (!genreMap.has(genre)) genreMap.set(genre, []);
    genreMap.get(genre)!.push({
      id: song.id,
      title: song.title,
      artist: song.artist ?? undefined,
    });
  }

  const songGroups: ClientFormSongGroup[] = [];
  // First add genres in canonical order.
  for (const genre of GENRE_ORDER) {
    const songs = genreMap.get(genre);
    if (songs && songs.length > 0) {
      songGroups.push({ genre, songs });
      genreMap.delete(genre);
    }
  }
  // Append any remaining genres not in the canonical list.
  for (const [genre, songs] of genreMap) {
    if (songs.length > 0) songGroups.push({ genre, songs });
  }

  const hasBand = services.some((s) => s.is_band);
  const hasDj = hasBand || services.some((s) => s.is_dj_only);
  const requiresMeal = services.some((s) => s.requires_meal);

  const dateStr =
    typeof gig.date === "string" ? gig.date : new Date(gig.date).toISOString().slice(0, 10);

  return {
    gigId: gig.id,
    date: dateStr,
    firstName: gig.first_name,
    lastName: gig.last_name,
    partnerName: gig.partner_name ?? undefined,
    venueName: gig.venue_name ?? undefined,
    location: gig.location ?? undefined,
    timings: gig.timings ?? undefined,
    contactNumber: gig.contact_number ?? undefined,
    parkingInfo: gig.parking_info ?? undefined,
    mealDetails: gig.meal_details ?? undefined,
    clientNotes: gig.client_notes ?? undefined,
    playlistUrl: gig.playlist_url ?? undefined,
    endOfNightSong: gig.end_of_night_song ?? undefined,
    firstDanceSong: gig.first_dance_song ?? undefined,
    firstDanceType: gig.first_dance_type ?? undefined,
    ceilidh: gig.ceilidh,
    ceilidhLength: gig.ceilidh_length ?? undefined,
    ceilidhStyle: gig.ceilidh_style ?? undefined,
    preferences: prefs,
    songGroups,
    hasBand,
    hasDj,
    requiresMeal,
  };
}

export async function saveClientForm(
  token: string,
  body: unknown
): Promise<{ ok: true }> {
  const gig = await gigsRepo.readGigByClientToken(token);
  if (!gig) throw new NotFoundError("Form not found");

  const input: SaveClientFormRequest = parseOrBadRequest(SaveClientFormSchema, body);

  // Validate must-plays length explicitly for a friendly error.
  if ((input.preferences?.mustPlays?.length ?? 0) > 3) {
    throw new BadRequestError("Maximum 3 must-play songs allowed");
  }

  await withTransaction(async () => {
    await gigsRepo.updateGig(gig.id, {
      // Pass through all existing required fields to satisfy the mutation interface.
      status: gig.status,
      firstName: gig.first_name,
      lastName: gig.last_name,
      date: typeof gig.date === "string" ? gig.date : new Date(gig.date).toISOString().slice(0, 10),
      travelCost: gig.travel_cost,
      discountPercent: gig.discount_percent,
      // Preserve all admin-only fields unchanged.
      enquiryId:      gig.enquiry_id      ?? undefined,
      attributionId:  gig.attribution_id  ?? undefined,
      name:           gig.name            ?? undefined,
      partnerName:    gig.partner_name    ?? undefined,
      email:          gig.email           ?? undefined,
      phone:          gig.phone           ?? undefined,
      totalPrice:     gig.total_price     ?? undefined,
      airtableId:     gig.airtable_id     ?? undefined,
      performerNotes: gig.performer_notes ?? undefined,
      // Fields the client can update:
      venueName:      input.venueName      ?? gig.venue_name        ?? undefined,
      location:       input.location       ?? gig.location          ?? undefined,
      timings:        input.timings        ?? gig.timings           ?? undefined,
      contactNumber:  input.contactNumber  ?? gig.contact_number    ?? undefined,
      parkingInfo:    input.parkingInfo    ?? gig.parking_info      ?? undefined,
      mealDetails:    input.mealDetails    ?? gig.meal_details      ?? undefined,
      clientNotes:    input.clientNotes    ?? gig.client_notes      ?? undefined,
      playlistUrl:    input.playlistUrl    ?? gig.playlist_url      ?? undefined,
      endOfNightSong: input.endOfNightSong ?? gig.end_of_night_song ?? undefined,
      firstDanceSong: input.firstDanceSong ?? gig.first_dance_song  ?? undefined,
      firstDanceType: input.firstDanceType ?? gig.first_dance_type  ?? undefined,
      ceilidh:        input.ceilidh        ?? gig.ceilidh,
      ceilidhLength:  input.ceilidhLength  ?? gig.ceilidh_length    ?? undefined,
      ceilidhStyle:   input.ceilidhStyle   ?? gig.ceilidh_style     ?? undefined,
    });

    const prefs = input.preferences;
    await Promise.all([
      prefsRepo.setPreferences(gig.id, "favourites",  prefs.favourites),
      prefsRepo.setPreferences(gig.id, "must_plays",  prefs.mustPlays),
      prefsRepo.setPreferences(gig.id, "do_not_plays", prefs.doNotPlays),
    ]);

    await gigsRepo.touchFormSavedAt(gig.id);
  });

  return { ok: true };
}
