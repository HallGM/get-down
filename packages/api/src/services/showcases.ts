import { z } from "zod";
import type {
  Showcase,
  ShowcaseExpenseLink,
  CreateShowcaseRequest,
  UpdateShowcaseRequest,
} from "@get-down/shared";
import * as showcasesRepo from "../repository/showcases.js";
import * as attributionsRepo from "../repository/attributions.js";
import * as expensesRepo from "../repository/expenses.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { withTransaction } from "../db/init.js";
import { parseOrBadRequest } from "../utils/parse.js";

export async function getShowcases(): Promise<Showcase[]> {
  const rows = await showcasesRepo.readShowcases();
  const ids = rows.map((r) => r.id);
  const linksMap = await showcasesRepo.readExpenseLinksByShowcaseIds(ids);
  return rows.map((row) => mapShowcase(row, linksMap.get(row.id) ?? []));
}

export async function getShowcaseById(id: number): Promise<Showcase> {
  const row = await showcasesRepo.readShowcaseById(id);
  if (!row) throw new NotFoundError("Showcase not found");
  const links = await showcasesRepo.readExpenseLinksByShowcaseId(id);
  return mapShowcase(row, links);
}

export async function createShowcase(input: CreateShowcaseRequest): Promise<Showcase> {
  const date = input.date;
  if (!date) throw new BadRequestError("date is required");

  return withTransaction(async () => {
    let attributionId = input.attributionId;
    if (!attributionId) {
      const name = input.fullName?.trim() || input.nickname?.trim() || "Showcase";
      const attrRow = await attributionsRepo.createAttribution({ name, type: "showcase" });
      attributionId = attrRow.id;
    }

    const row = await showcasesRepo.createShowcase({
      attributionId,
      nickname: input.nickname?.trim(),
      fullName: input.fullName?.trim(),
      date,
      location: input.location?.trim(),
      airtableId: input.airtableId,
      costAirtable: input.costAirtable ?? null,
    });
    return mapShowcase(row, []);
  });
}

export async function updateShowcase(id: number, input: UpdateShowcaseRequest): Promise<Showcase> {
  const existing = await getShowcaseById(id);
  const row = await showcasesRepo.updateShowcase(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("Showcase not found");
  const links = await showcasesRepo.readExpenseLinksByShowcaseId(id);
  return mapShowcase(row, links);
}

export async function deleteShowcase(id: number): Promise<void> {
  const deleted = await showcasesRepo.deleteShowcase(id);
  if (!deleted) throw new NotFoundError("Showcase not found");
}

// ─── Expense link management ──────────────────────────────────────────────────

const LinkExpenseSchema = z.object({ expenseId: z.number().int() });

export async function linkExpenseToShowcase(showcaseId: number, body: unknown): Promise<void> {
  const { expenseId } = parseOrBadRequest(LinkExpenseSchema, body);
  const [showcase, expense] = await Promise.all([
    showcasesRepo.readShowcaseById(showcaseId),
    expensesRepo.readExpenseById(expenseId),
  ]);
  if (!showcase) throw new NotFoundError("Showcase not found");
  if (!expense) throw new NotFoundError("Expense not found");
  await showcasesRepo.linkExpenseToShowcase(showcaseId, expenseId);
}

export async function unlinkExpenseFromShowcase(showcaseId: number, expenseId: number): Promise<void> {
  const showcase = await showcasesRepo.readShowcaseById(showcaseId);
  if (!showcase) throw new NotFoundError("Showcase not found");
  await showcasesRepo.unlinkExpenseFromShowcase(showcaseId, expenseId);
}

const UpdateExpenseLinkSchema = z.object({
  apportionedAmount: z.number().int().positive().nullable(),
});

export async function updateExpenseLink(
  showcaseId: number,
  expenseId: number,
  body: unknown
): Promise<void> {
  const { apportionedAmount } = parseOrBadRequest(UpdateExpenseLinkSchema, body);
  const showcase = await showcasesRepo.readShowcaseById(showcaseId);
  if (!showcase) throw new NotFoundError("Showcase not found");
  await showcasesRepo.updateApportionedAmount(showcaseId, expenseId, apportionedAmount);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function toDateString(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function mapShowcase(
  row: showcasesRepo.ShowcaseRow,
  links: showcasesRepo.ShowcaseExpenseLinkRow[]
): Showcase {
  return {
    id: row.id,
    attributionId: row.attribution_id,
    nickname: row.nickname ?? undefined,
    fullName: row.full_name ?? undefined,
    date: toDateString(row.date) ?? row.date,
    location: row.location ?? undefined,
    airtableId: row.airtable_id ?? undefined,
    costAirtable: row.cost_airtable ?? undefined,
    expenseLinks: links.map(
      (l): ShowcaseExpenseLink => ({
        expenseId: l.expense_id,
        apportionedAmount: l.apportioned_amount,
      })
    ),
  };
}

function buildMutationInput(
  input: UpdateShowcaseRequest,
  existing: Showcase
): showcasesRepo.ShowcaseMutationInput {
  const attributionId = input.attributionId ?? existing.attributionId;
  const date = input.date ?? existing.date;
  if (!date) throw new BadRequestError("date is required");

  return {
    attributionId,
    nickname: input.nickname?.trim() ?? existing.nickname,
    fullName: input.fullName?.trim() ?? existing.fullName,
    date,
    location: input.location?.trim() ?? existing.location,
    airtableId: input.airtableId ?? existing.airtableId,
    // Preserve existing value when field is absent from request; allow explicit null to clear it
    costAirtable: 'costAirtable' in input ? (input.costAirtable ?? null) : (existing.costAirtable ?? null),
  };
}
