import {
  deriveClientFormCapabilities,
  isBandService,
  serviceHasGroup,
  SERVICE_GROUP_NAMES,
  type ClientFormCapabilities,
  type ClientFormResponse,
  type ClientFormSongGroup,
  type SaveClientFormRequest,
} from "@get-down/shared";
import { z } from "zod";
import * as gigsRepo from "../repository/gigs.js";
import * as prefsRepo from "../repository/gig_song_preferences.js";
import * as songsRepo from "../repository/songs.js";
import * as exclusionsRepo from "../repository/song_service_exclusions.js";
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
  ceremonySongChoices: z.string().max(10_000).optional(),
  receptionMusicDetails: z.string().max(10_000).optional(),
  walkOnSong: z.string().max(2_000).optional(),
  introductionWording: z.string().max(2_000).optional(),
  piperTuneRequests: z.string().max(10_000).optional(),
  bagpipesDetails: z.string().max(10_000).optional(),
  speechesPaRequirements: z.string().max(10_000).optional(),
  ceremonyReadingsNotes: z.string().max(10_000).optional(),
  preparationLocations: z.string().max(10_000).optional(),
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

  // Compute booked band-size service IDs
  const hasGroup = (name: string) => services.some((service) => serviceHasGroup(service, name));
  const hasBand = hasGroup(SERVICE_GROUP_NAMES.BAND);
  const hasDjOnly = hasGroup(SERVICE_GROUP_NAMES.DJ_ONLY);
  const requiresMeal = hasGroup(SERVICE_GROUP_NAMES.REQUIRES_MEAL);
  const capabilities = deriveClientFormCapabilities({
    ceremonyMusic: hasGroup(SERVICE_GROUP_NAMES.CEREMONY_MUSIC),
    eveningEntertainment: hasGroup(SERVICE_GROUP_NAMES.EVENING_ENTERTAINMENT),
    bagpipes: hasGroup(SERVICE_GROUP_NAMES.BAGPIPES),
    videography: hasGroup(SERVICE_GROUP_NAMES.VIDEOGRAPHY),
    gettingReady: hasGroup(SERVICE_GROUP_NAMES.GETTING_READY),
    hasBand,
    hasMusicCapability: hasBand || hasDjOnly,
    requiresMeal,
  });
  const bookedBandServiceIds = services.filter(isBandService).map((service) => service.id);

  // Bulk fetch exclusions for all songs
  const songIds = allSongs.map(s => s.id);
  const exclusionsMap = await exclusionsRepo.readExclusionsByMultipleSongIds(songIds);

  // Filter out songs excluded for any of the booked band-size services
  const filteredSongs = allSongs.filter(song => {
    if (!song.active) return false;
    const exclusions = exclusionsMap.get(song.id) ?? [];
    // Exclude if any exclusion matches a booked band-size service
    return !exclusions.some(serviceId => bookedBandServiceIds.includes(serviceId));
  });

  // Group songs by genre, preserving the canonical Fillout order.
  const genreMap = new Map<string, { id: number; title: string; artist?: string }[]>();
  for (const song of filteredSongs) {
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
    capabilities,
     ceremonySongChoices: gig.ceremony_song_choices ?? undefined,
     receptionMusicDetails: gig.reception_music_details ?? undefined,
     walkOnSong: gig.walk_on_song ?? undefined,
     introductionWording: gig.introduction_wording ?? undefined,
     piperTuneRequests: gig.piper_tune_requests ?? undefined,
     bagpipesDetails: gig.bagpipes_details ?? undefined,
     speechesPaRequirements: gig.speeches_pa_requirements ?? undefined,
     ceremonyReadingsNotes: gig.ceremony_readings_notes ?? undefined,
     preparationLocations: gig.preparation_locations ?? undefined,
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
      privateNotes:   gig.private_notes   ?? undefined,
      vimeoUrl:       gig.vimeo_url       ?? undefined,
      dropboxUrl:     gig.dropbox_url     ?? undefined,
      // Fields the client can update:
      venueName: preserveUnlessProvided(input.venueName, gig.venue_name),
      location: preserveUnlessProvided(input.location, gig.location),
      timings: preserveUnlessProvided(input.timings, gig.timings),
      contactNumber: preserveUnlessProvided(input.contactNumber, gig.contact_number),
      parkingInfo: preserveUnlessProvided(input.parkingInfo, gig.parking_info),
      mealDetails: preserveUnlessProvided(input.mealDetails, gig.meal_details),
      clientNotes: preserveUnlessProvided(input.clientNotes, gig.client_notes),
      playlistUrl: preserveUnlessProvided(input.playlistUrl, gig.playlist_url),
      endOfNightSong: preserveUnlessProvided(input.endOfNightSong, gig.end_of_night_song),
      firstDanceSong: preserveUnlessProvided(input.firstDanceSong, gig.first_dance_song),
      firstDanceType: preserveUnlessProvided(input.firstDanceType, gig.first_dance_type),
      ceilidh:        input.ceilidh        ?? gig.ceilidh,
        ceilidhLength: preserveUnlessProvided(input.ceilidhLength, gig.ceilidh_length),
        ceilidhStyle: preserveUnlessProvided(input.ceilidhStyle, gig.ceilidh_style),
        ceremonySongChoices: preserveUnlessProvided(input.ceremonySongChoices, gig.ceremony_song_choices),
        receptionMusicDetails: preserveUnlessProvided(input.receptionMusicDetails, gig.reception_music_details),
        walkOnSong: preserveUnlessProvided(input.walkOnSong, gig.walk_on_song),
        introductionWording: preserveUnlessProvided(input.introductionWording, gig.introduction_wording),
        piperTuneRequests: preserveUnlessProvided(input.piperTuneRequests, gig.piper_tune_requests),
        bagpipesDetails: preserveUnlessProvided(input.bagpipesDetails, gig.bagpipes_details),
        speechesPaRequirements: preserveUnlessProvided(input.speechesPaRequirements, gig.speeches_pa_requirements),
        ceremonyReadingsNotes: preserveUnlessProvided(input.ceremonyReadingsNotes, gig.ceremony_readings_notes),
        preparationLocations: preserveUnlessProvided(input.preparationLocations, gig.preparation_locations),
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

function preserveUnlessProvided(inputValue: string | undefined, existingValue: string | null): string | undefined {
  return inputValue !== undefined ? inputValue : existingValue ?? undefined;
}
