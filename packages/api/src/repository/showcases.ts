import { run_query } from "../db/init.js";

export interface ShowcaseRow {
  id: number;
  attribution_id: number;
  nickname: string | null;
  full_name: string | null;
  name: string | null;
  date: string;
  location: string | null;
  airtable_id: string | null;
}

export interface ShowcaseMutationInput {
  attributionId: number;
  nickname?: string;
  fullName?: string;
  name?: string;
  date: string;
  location?: string;
  airtableId?: string;
}

const SELECT_COLS = `id, attribution_id, nickname, full_name, name, date, location, airtable_id`;

export async function createShowcase(input: ShowcaseMutationInput): Promise<ShowcaseRow> {
  const rows = await run_query<ShowcaseRow>({
    text: `
      INSERT INTO showcases (attribution_id, nickname, full_name, name, date, location, airtable_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.attributionId,
      input.nickname ?? null,
      input.fullName ?? null,
      input.name ?? null,
      input.date,
      input.location ?? null,
      input.airtableId ?? null,
    ],
  });
  return rows[0];
}

export async function readShowcases(): Promise<ShowcaseRow[]> {
  return run_query<ShowcaseRow>({
    text: `SELECT ${SELECT_COLS} FROM showcases ORDER BY date DESC;`,
  });
}

export async function readShowcaseById(id: number): Promise<ShowcaseRow | null> {
  const rows = await run_query<ShowcaseRow>({
    text: `SELECT ${SELECT_COLS} FROM showcases WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateShowcase(
  id: number,
  input: ShowcaseMutationInput
): Promise<ShowcaseRow | null> {
  const rows = await run_query<ShowcaseRow>({
    text: `
      UPDATE showcases
      SET attribution_id = $1, nickname = $2, full_name = $3, name = $4, date = $5, location = $6, airtable_id = $7
      WHERE id = $8
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.attributionId,
      input.nickname ?? null,
      input.fullName ?? null,
      input.name ?? null,
      input.date,
      input.location ?? null,
      input.airtableId ?? null,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function deleteShowcase(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM showcases WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
