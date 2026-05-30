import { run_query } from "../db/init.js";

export interface RehearsalRow {
  id: number;
  name: string;
  date: string;
  location: string | null;
  cost: number | null;
  notes: string | null;
  airtable_id: string | null;
  expense_id: number | null;
}

export interface RehearsalWithGigRow extends RehearsalRow {
  cost_share: number | null;
  gig_count: number;
  expense_description: string | null;
  expense_amount: number | null;
}

export interface RehearsalGigLinkRow {
  gig_id: number;
  cost_share: number | null;
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

const SELECT_COLS = `id, name, date, location, cost, notes, airtable_id, expense_id`;

export async function createRehearsal(input: RehearsalMutationInput): Promise<RehearsalRow> {
  const rows = await run_query<RehearsalRow>({
    text: `
      INSERT INTO rehearsals (name, date, location, cost, notes, airtable_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${SELECT_COLS};
    `,
    values: [input.name, input.date, input.location ?? null, input.cost ?? null, input.notes ?? null, input.airtableId ?? null],
  });
  return rows[0];
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

export async function readRehearsalsByGigId(gigId: number): Promise<RehearsalWithGigRow[]> {
  return run_query<RehearsalWithGigRow>({
    text: `
      SELECT
        r.id, r.name, r.date, r.location, r.cost, r.notes, r.airtable_id, r.expense_id,
        rg.cost_share,
        (SELECT COUNT(*) FROM rehearsals_gigs rg2 WHERE rg2.rehearsal_id = r.id)::int AS gig_count,
        e.description AS expense_description,
        e.amount      AS expense_amount
      FROM rehearsals r
      JOIN rehearsals_gigs rg ON rg.rehearsal_id = r.id AND rg.gig_id = $1
      LEFT JOIN expenses e ON e.id = r.expense_id
      ORDER BY r.date DESC;
    `,
    values: [gigId],
  });
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

export async function getGigLinksForRehearsal(rehearsalId: number): Promise<RehearsalGigLinkRow[]> {
  return run_query<RehearsalGigLinkRow>({
    text: `SELECT gig_id, cost_share FROM rehearsals_gigs WHERE rehearsal_id = $1;`,
    values: [rehearsalId],
  });
}

export async function linkRehearsalToGig(
  rehearsalId: number,
  gigId: number,
  costShare: number | null
): Promise<void> {
  await run_query({
    text: `
      INSERT INTO rehearsals_gigs (rehearsal_id, gig_id, cost_share)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING;
    `,
    values: [rehearsalId, gigId, costShare],
  });
}

export async function unlinkRehearsalFromGig(rehearsalId: number, gigId: number): Promise<void> {
  await run_query({
    text: `DELETE FROM rehearsals_gigs WHERE rehearsal_id = $1 AND gig_id = $2;`,
    values: [rehearsalId, gigId],
  });
}

export async function updateCostShare(
  rehearsalId: number,
  gigId: number,
  costShare: number | null
): Promise<void> {
  await run_query({
    text: `
      UPDATE rehearsals_gigs SET cost_share = $1
      WHERE rehearsal_id = $2 AND gig_id = $3;
    `,
    values: [costShare, rehearsalId, gigId],
  });
}

export async function setRehearsalExpense(
  rehearsalId: number,
  expenseId: number | null
): Promise<void> {
  await run_query({
    text: `UPDATE rehearsals SET expense_id = $1 WHERE id = $2;`,
    values: [expenseId, rehearsalId],
  });
}
