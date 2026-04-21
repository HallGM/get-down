import { run_query } from "../db/init.js";

export interface GenreRow {
  id: number;
  name: string;
}

export async function readGenres(): Promise<GenreRow[]> {
  return run_query<GenreRow>({
    text: `SELECT id, name FROM genres ORDER BY name;`,
  });
}

export async function createGenre(name: string): Promise<GenreRow> {
  const rows = await run_query<GenreRow>({
    text: `INSERT INTO genres (name) VALUES ($1) RETURNING id, name;`,
    values: [name],
  });
  return rows[0];
}

export async function deleteGenre(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM genres WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

export async function isGenreInUse(id: number): Promise<boolean> {
  const rows = await run_query<{ count: string }>({
    text: `SELECT COUNT(*) AS count FROM songs WHERE genre_id = $1;`,
    values: [id],
  });
  return parseInt(rows[0].count, 10) > 0;
}

export async function upsertGenresByName(names: string[]): Promise<GenreRow[]> {
  if (names.length === 0) return [];
  // Insert all, ignore conflicts, then return all
  const placeholders = names.map((_, i) => `($${i + 1})`).join(", ");
  await run_query({
    text: `INSERT INTO genres (name) VALUES ${placeholders} ON CONFLICT (name) DO NOTHING;`,
    values: names,
  });
  return run_query<GenreRow>({
    text: `SELECT id, name FROM genres ORDER BY name;`,
  });
}
