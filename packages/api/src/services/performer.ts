import type { PerformerGig, PerformerGigDetail, PerformerResponse } from "@get-down/shared";
import * as peopleRepo from "../repository/people.js";
import * as gigsRepo from "../repository/gigs.js";
import * as gigSongPreferencesRepo from "../repository/gig_song_preferences.js";
import * as songsRepo from "../repository/songs.js";
import * as assignedRolesRepo from "../repository/assigned_roles.js";
import { NotFoundError } from "../errors.js";

export async function getPerformerByToken(token: string): Promise<PerformerResponse> {
  const person = await peopleRepo.readPersonByPerformerToken(token);
  if (!person) throw new NotFoundError("Performer not found");

  const gigRows = await gigsRepo.readUpcomingGigsByPersonId(person.id);

  const gigs: PerformerGig[] = gigRows.map((r) => ({
    id: r.id,
    date: typeof r.date === "string" ? r.date : new Date(r.date).toISOString().slice(0, 10),
    firstName: r.first_name,
    lastName: r.last_name,
    venueName: r.venue_name ?? undefined,
    location: r.location ?? undefined,
  }));

  return {
    person: {
      id: person.id,
      firstName: person.first_name,
      lastName: person.last_name ?? undefined,
      displayName: person.display_name ?? undefined,
    },
    gigs,
  };
}

export async function getPerformerGigDetail(
  token: string,
  gigId: number
): Promise<PerformerGigDetail> {
  const person = await peopleRepo.readPersonByPerformerToken(token);
  if (!person) throw new NotFoundError("Performer not found");

  // Verify the performer is assigned to this gig
  const roles = await assignedRolesRepo.readAssignedRolesByGigId(gigId);
  const isAssigned = roles.some((r) => r.person_id === person.id);
  if (!isAssigned) throw new NotFoundError("Gig not found");

  // Fetch all data in parallel
  const [gig, services, prefs, allRoles] = await Promise.all([
    gigsRepo.readGigById(gigId),
    gigsRepo.readGigServicesByGigId(gigId),
    gigSongPreferencesRepo.readPreferencesByGigId(gigId),
    assignedRolesRepo.readAssignedRolesByGigId(gigId),
  ]);

  if (!gig) throw new NotFoundError("Gig not found");

  // Resolve song IDs → names
  const allSongIds = [...new Set([...prefs.mustPlays, ...prefs.doNotPlays])];
  const songRows = await songsRepo.readSongsByIds(allSongIds);
  const songMap = new Map(songRows.map((s) => [s.id, s]));

  const mustPlaySongs = prefs.mustPlays.map((id) => {
    const s = songMap.get(id);
    return { title: s?.title ?? `Song #${id}`, artist: s?.artist ?? undefined };
  });
  const avoidSongs = prefs.doNotPlays.map((id) => {
    const s = songMap.get(id);
    return { title: s?.title ?? `Song #${id}`, artist: s?.artist ?? undefined };
  });

  // Resolve co-performer person IDs (excluding the requesting performer)
  const coPerformerPersonIds = allRoles
    .filter((r) => r.person_id !== null && r.person_id !== person.id)
    .map((r) => r.person_id as number);

  const uniqueCoIds = [...new Set(coPerformerPersonIds)];
  const coPerformerRows = await Promise.all(uniqueCoIds.map((id) => peopleRepo.readPersonById(id)));

  const otherPerformers = coPerformerRows
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name ?? undefined,
      displayName: p.display_name ?? undefined,
    }));

  const dateStr = typeof gig.date === "string" ? gig.date : new Date(gig.date).toISOString().slice(0, 10);

  return {
    id: gig.id,
    date: dateStr,
    firstName: gig.first_name,
    lastName: gig.last_name,
    venueName: gig.venue_name ?? undefined,
    location: gig.location ?? undefined,
    services: services.map((s) => ({ id: s.id, name: s.name })),
    timings: gig.timings ?? undefined,
    contactNumber: gig.contact_number ?? undefined,
    parkingInfo: gig.parking_info ?? undefined,
    clientNotes: gig.client_notes ?? undefined,
    performerNotes: gig.performer_notes ?? undefined,
    playlistUrl: gig.playlist_url ?? undefined,
    endOfNightSong: gig.end_of_night_song ?? undefined,
    firstDanceSong: gig.first_dance_song ?? undefined,
    firstDanceType: gig.first_dance_type ?? undefined,
    ceilidh: gig.ceilidh,
    ceilidhLength: gig.ceilidh_length ?? undefined,
    ceilidhStyle: gig.ceilidh_style ?? undefined,
    otherPerformers,
    mustPlaySongs,
    avoidSongs,
  };
}
