import type { GigSongPreferences } from "@get-down/shared";
import { z } from "zod";
import * as prefsRepo from "../repository/gig_song_preferences.js";
import { parseOrBadRequest } from "../utils/parse.js";

const PreferencesSchema = z.object({
  favourites: z.array(z.number().int().positive()).default([]),
  mustPlays: z.array(z.number().int().positive()).default([]),
  doNotPlays: z.array(z.number().int().positive()).default([]),
});

export async function getPreferences(gigId: number): Promise<GigSongPreferences> {
  return prefsRepo.readPreferencesByGigId(gigId);
}

export async function updatePreferences(
  gigId: number,
  input: GigSongPreferences
): Promise<GigSongPreferences> {
  const { favourites, mustPlays, doNotPlays } = parseOrBadRequest(PreferencesSchema, input);

  await Promise.all([
    prefsRepo.setPreferences(gigId, "favourites", favourites),
    prefsRepo.setPreferences(gigId, "must_plays", mustPlays),
    prefsRepo.setPreferences(gigId, "do_not_plays", doNotPlays),
  ]);

  return prefsRepo.readPreferencesByGigId(gigId);
}
