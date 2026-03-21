import type {
  Showcase,
  CreateShowcaseRequest,
  UpdateShowcaseRequest,
} from "@get-down/shared";
import * as showcasesRepo from "../repository/showcases.js";
import { BadRequestError, NotFoundError } from "../errors.js";

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
  const row = await showcasesRepo.createShowcase(buildMutationInput(input));
  return mapShowcase(row);
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
    name: row.name ?? undefined,
    date: toDateString(row.date) ?? row.date,
    location: row.location ?? undefined,
    airtableId: row.airtable_id ?? undefined,
  };
}

function buildMutationInput(
  input: CreateShowcaseRequest | UpdateShowcaseRequest,
  existing?: Showcase
): showcasesRepo.ShowcaseMutationInput {
  const attributionId = input.attributionId ?? existing?.attributionId;
  if (!attributionId) throw new BadRequestError("attributionId is required");
  const date = input.date ?? existing?.date;
  if (!date) throw new BadRequestError("date is required");

  return {
    attributionId,
    nickname: input.nickname?.trim() ?? existing?.nickname,
    fullName: input.fullName?.trim() ?? existing?.fullName,
    name: input.name?.trim() ?? existing?.name,
    date,
    location: input.location?.trim() ?? existing?.location,
    airtableId: input.airtableId ?? existing?.airtableId,
  };
}
