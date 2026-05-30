import type {
  Showcase,
  CreateShowcaseRequest,
  UpdateShowcaseRequest,
} from "@get-down/shared";
import * as showcasesRepo from "../repository/showcases.js";
import * as attributionsRepo from "../repository/attributions.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { withTransaction } from "../db/init.js";

export async function getShowcases(): Promise<Showcase[]> {
  const rows = await showcasesRepo.readShowcases();
  return rows.map(mapShowcase);
}

export async function getShowcaseById(id: number): Promise<Showcase> {
  const row = await showcasesRepo.readShowcaseById(id);
  if (!row) throw new NotFoundError("Showcase not found");
  return mapShowcase(row);
}

export async function createShowcase(input: CreateShowcaseRequest): Promise<Showcase> {
  const date = input.date;
  if (!date) throw new BadRequestError("date is required");

  return withTransaction(async () => {
    // Auto-create the attribution if no attributionId is supplied
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
    });
    return mapShowcase(row);
  });
}

export async function updateShowcase(id: number, input: UpdateShowcaseRequest): Promise<Showcase> {
  const existing = await getShowcaseById(id);
  const row = await showcasesRepo.updateShowcase(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("Showcase not found");
  return mapShowcase(row);
}

export async function deleteShowcase(id: number): Promise<void> {
  const deleted = await showcasesRepo.deleteShowcase(id);
  if (!deleted) throw new NotFoundError("Showcase not found");
}

function toDateString(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function mapShowcase(row: showcasesRepo.ShowcaseRow): Showcase {
  return {
    id: row.id,
    attributionId: row.attribution_id,
    nickname: row.nickname ?? undefined,
    fullName: row.full_name ?? undefined,
    date: toDateString(row.date) ?? row.date,
    location: row.location ?? undefined,
    airtableId: row.airtable_id ?? undefined,
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
  };
}
