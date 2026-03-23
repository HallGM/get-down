import { run_query, withTransaction } from "../db/init.js";

export type PreferenceType = "favourites" | "must_plays" | "do_not_plays";

const TABLE: Record<PreferenceType, string> = {
  favourites: "gig_song_favourites",
  must_plays: "gig_song_must_plays",
  do_not_plays: "gig_song_do_not_plays",
};

export interface GigSongPreferencesRow {
  favourites: number[];
  mustPlays: number[];
  doNotPlays: number[];
}

export async function readPreferencesByGigId(gigId: number): Promise<GigSongPreferencesRow> {
  const [favRows, mustRows, doNotRows] = await Promise.all([
    run_query<{ song_id: number }>({
      text: `SELECT song_id FROM gig_song_favourites WHERE gig_id = $1;`,
      values: [gigId],
    }),
    run_query<{ song_id: number }>({
      text: `SELECT song_id FROM gig_song_must_plays WHERE gig_id = $1;`,
      values: [gigId],
    }),
    run_query<{ song_id: number }>({
      text: `SELECT song_id FROM gig_song_do_not_plays WHERE gig_id = $1;`,
      values: [gigId],
    }),
  ]);
  return {
    favourites: favRows.map(r => r.song_id),
    mustPlays: mustRows.map(r => r.song_id),
    doNotPlays: doNotRows.map(r => r.song_id),
  };
}

export async function setPreferences(
  gigId: number,
  type: PreferenceType,
  songIds: number[]
): Promise<void> {
  const table = TABLE[type];
  await withTransaction(async () => {
    await run_query({
      text: `DELETE FROM ${table} WHERE gig_id = $1;`,
      values: [gigId],
    });
    if (songIds.length > 0) {
      await run_query({
        text: `INSERT INTO ${table} (gig_id, song_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING;`,
        values: [gigId, songIds],
      });
    }
  });
}
