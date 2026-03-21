import { run_query } from "../db/init.js";

export interface RehearsalRow {
  id: number;
  name: string;
  date: string;
  location: string | null;
  cost: number | null;
  notes: string | null;
  airtable_id: string | null;
}

export interface RehearsalMutationInput {
  name: string;
  date: string;
  location?: string;
  cost?: number;
  notes?: string;
  gigIds?: number[];
  airtableId?: string;
}

const SELECT_COLS = `id, name, date, location, cost, notes, airtable_id`;

export async function createRehearsal(input: RehearsalMutationInput): Promise<RehearsalRow> {
  const rows = await run_query<RehearsalRow>({
    text: `
      INSERT INTO rehearsals (name, date, location, cost, notes, airtable_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${SELECT_COLS};
    `,
    values: [input.name, input.date, input.location ?? null, input.cost ?? null, input.notes ?? null, input.airtableId ?? null],
  });
  const rehearsal = rows[0];
  if (input.gigIds && input.gigIds.length > 0) {
    for (const gigId of input.gigIds) {
      await run_query({
        text: `INSERT INTO rehearsals_gigs (rehearsal_id, gig_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        values: [rehearsal.id, gigId],
      });
    }
  }
  return rehearsal;
}

export async function readRehearsals(): Promise<RehearsalRow[]> {
  return run_query<RehearsalRow>({
    text: `SELECT ${SELECT_COLS} FROM rehearsals ORDER BY date DESC;`,
  });
}

export async function readRehearsalById(id: number): Promise<RehearsalRow | null> {
  const rows = await run_query<RehearsalRow>({
    text: `SELECT ${SELECT_COLS} FROM rehearsals WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateRehearsal(
  id: number,
  input: RehearsalMutationInput
): Promise<RehearsalRow | null> {
  const rows = await run_query<RehearsalRow>({
    text: `
      UPDATE rehearsals
      SET name = $1, date = $2, location = $3, cost = $4, notes = $5, airtable_id = $6
      WHERE id = $7
      RETURNING ${SELECT_COLS};
    `,
    values: [input.name, input.date, input.location ?? null, input.cost ?? null, input.notes ?? null, input.airtableId ?? null, id],
  });
  if (!rows[0]) return null;
  if (input.gigIds !== undefined) {
    await run_query({ text: `DELETE FROM rehearsals_gigs WHERE rehearsal_id = $1;`, values: [id] });
    for (const gigId of input.gigIds) {
      await run_query({
        text: `INSERT INTO rehearsals_gigs (rehearsal_id, gig_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        values: [id, gigId],
      });
    }
  }
  return rows[0];
}

export async function deleteRehearsal(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM rehearsals WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
