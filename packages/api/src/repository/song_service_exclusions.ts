import { run_query } from "../db/init.js";

/**
 * Read all service IDs excluded for a single song
 */
export async function readExclusionsBySongId(songId: number): Promise<number[]> {
  const rows = await run_query<{ service_id: number }>({
    text: `
      SELECT service_id
      FROM song_service_exclusions
      WHERE song_id = $1
      ORDER BY service_id;
    `,
    values: [songId],
  });
  return rows.map((r) => r.service_id);
}

/**
 * Bulk read exclusions for multiple songs.
 * Returns a Map<songId, exclusionServiceIds[]>
 */
export async function readExclusionsByMultipleSongIds(songIds: number[]): Promise<Map<number, number[]>> {
  if (songIds.length === 0) return new Map();

  const rows = await run_query<{ song_id: number; service_id: number }>({
    text: `
      SELECT song_id, service_id
      FROM song_service_exclusions
      WHERE song_id = ANY($1::int[])
      ORDER BY song_id, service_id;
    `,
    values: [songIds],
  });

  const result = new Map<number, number[]>();
  for (const songId of songIds) {
    result.set(songId, []);
  }
  for (const row of rows) {
    result.get(row.song_id)!.push(row.service_id);
  }
  return result;
}

/**
 * Replace all exclusions for a song (delete old, insert new).
 * Must be called within a transaction.
 */
export async function replaceExclusions(songId: number, serviceIds: number[]): Promise<void> {
  // Delete all existing exclusions for this song
  await run_query({
    text: `DELETE FROM song_service_exclusions WHERE song_id = $1;`,
    values: [songId],
  });

  // Insert new exclusions
  if (serviceIds.length > 0) {
    const valuePairs = serviceIds.map((_, i) => `($1, $${i + 2})`).join(", ");
    await run_query({
      text: `
        INSERT INTO song_service_exclusions (song_id, service_id)
        VALUES ${valuePairs};
      `,
      values: [songId, ...serviceIds],
    });
  }
}
