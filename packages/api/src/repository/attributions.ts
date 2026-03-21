import { run_query } from "../db/init.js";

interface AttributionRow {
  id: number;
  name: string;
  type: string;
  notes: string | null;
  airtable_id: string | null;
}

export interface AttributionMutationInput {
  name: string;
  type: string;
  notes?: string;
  airtableId?: string;
}

export async function createAttribution(input: AttributionMutationInput): Promise<AttributionRow> {
  const rows = await run_query<AttributionRow>({
    text: `
      INSERT INTO attributions (name, type, notes, airtable_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, type, notes, airtable_id;
    `,
    values: [input.name, input.type, input.notes ?? null, input.airtableId ?? null],
  });
  return rows[0];
}

export async function readAttributions(): Promise<AttributionRow[]> {
  return run_query<AttributionRow>({
    text: `SELECT id, name, type, notes, airtable_id FROM attributions ORDER BY name;`,
  });
}

export async function readAttributionById(id: number): Promise<AttributionRow | null> {
  const rows = await run_query<AttributionRow>({
    text: `SELECT id, name, type, notes, airtable_id FROM attributions WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function updateAttribution(
  id: number,
  input: AttributionMutationInput
): Promise<AttributionRow | null> {
  const rows = await run_query<AttributionRow>({
    text: `
      UPDATE attributions
      SET name = $1, type = $2, notes = $3, airtable_id = $4
      WHERE id = $5
      RETURNING id, name, type, notes, airtable_id;
    `,
    values: [input.name, input.type, input.notes ?? null, input.airtableId ?? null, id],
  });
  return rows[0] ?? null;
}

export async function deleteAttribution(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM attributions WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
