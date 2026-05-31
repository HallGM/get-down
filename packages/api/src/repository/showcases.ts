import { run_query } from "../db/init.js";
import { groupById } from "../utils/groupById.js";

export interface ShowcaseRow {
  id: number;
  attribution_id: number;
  nickname: string | null;
  full_name: string | null;
  date: string;
  location: string | null;
  airtable_id: string | null;
  cost_airtable: number | null;
}

export interface ShowcaseMutationInput {
  attributionId: number;
  nickname?: string;
  fullName?: string;
  date: string;
  location?: string;
  airtableId?: string;
  costAirtable?: number | null;
}

const SELECT_COLS = `id, attribution_id, nickname, full_name, date, location, airtable_id, cost_airtable`;

export async function createShowcase(input: ShowcaseMutationInput): Promise<ShowcaseRow> {
  const rows = await run_query<ShowcaseRow>({
    text: `
      INSERT INTO showcases (attribution_id, nickname, full_name, date, location, airtable_id, cost_airtable)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.attributionId,
      input.nickname ?? null,
      input.fullName ?? null,
      input.date,
      input.location ?? null,
      input.airtableId ?? null,
      input.costAirtable ?? null,
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
      SET attribution_id = $1, nickname = $2, full_name = $3, date = $4, location = $5,
          airtable_id = $6, cost_airtable = $7
      WHERE id = $8
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.attributionId,
      input.nickname ?? null,
      input.fullName ?? null,
      input.date,
      input.location ?? null,
      input.airtableId ?? null,
      input.costAirtable ?? null,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function readShowcaseByAttributionId(attributionId: number): Promise<ShowcaseRow | null> {
  const rows = await run_query<ShowcaseRow>({
    text: `SELECT ${SELECT_COLS} FROM showcases WHERE attribution_id = $1 LIMIT 1;`,
    values: [attributionId],
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

// ─── Expense links (showcase_expenses) ───────────────────────────────────────

export interface ShowcaseExpenseLinkRow {
  showcase_id: number;
  expense_id: number;
  apportioned_amount: number | null;
}

export async function readExpenseLinksByShowcaseId(
  showcaseId: number
): Promise<ShowcaseExpenseLinkRow[]> {
  return run_query<ShowcaseExpenseLinkRow>({
    text: `SELECT showcase_id, expense_id, apportioned_amount FROM showcase_expenses WHERE showcase_id = $1 ORDER BY expense_id;`,
    values: [showcaseId],
  });
}

export async function readExpenseLinksByShowcaseIds(
  showcaseIds: number[]
): Promise<Map<number, ShowcaseExpenseLinkRow[]>> {
  if (showcaseIds.length === 0) return new Map();
  const rows = await run_query<ShowcaseExpenseLinkRow>({
    text: `
      SELECT showcase_id, expense_id, apportioned_amount
      FROM showcase_expenses
      WHERE showcase_id = ANY($1::int[])
      ORDER BY showcase_id, expense_id;
    `,
    values: [showcaseIds],
  });
  return groupById(rows, (r) => r.showcase_id, (r) => r);
}

export async function linkExpenseToShowcase(showcaseId: number, expenseId: number): Promise<void> {
  await run_query({
    text: `
      INSERT INTO showcase_expenses (showcase_id, expense_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `,
    values: [showcaseId, expenseId],
  });
}

export async function unlinkExpenseFromShowcase(showcaseId: number, expenseId: number): Promise<void> {
  await run_query({
    text: `DELETE FROM showcase_expenses WHERE showcase_id = $1 AND expense_id = $2;`,
    values: [showcaseId, expenseId],
  });
}

export async function updateApportionedAmount(
  showcaseId: number,
  expenseId: number,
  amount: number | null
): Promise<void> {
  await run_query({
    text: `UPDATE showcase_expenses SET apportioned_amount = $1 WHERE showcase_id = $2 AND expense_id = $3;`,
    values: [amount, showcaseId, expenseId],
  });
}
