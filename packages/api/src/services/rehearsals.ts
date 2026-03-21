import type { Rehearsal, CreateRehearsalRequest, UpdateRehearsalRequest } from "@get-down/shared";
import * as rehearsalsRepo from "../repository/rehearsals.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getRehearsals(): Promise<Rehearsal[]> {
  const rows = await rehearsalsRepo.readRehearsals();
  return rows.map(mapRehearsal);
}

export async function getRehearsalById(id: number): Promise<Rehearsal> {
  const row = await rehearsalsRepo.readRehearsalById(id);
  if (!row) throw new NotFoundError("Rehearsal not found");
  return mapRehearsal(row);
}

export async function createRehearsal(input: CreateRehearsalRequest): Promise<Rehearsal> {
  const row = await rehearsalsRepo.createRehearsal(buildMutationInput(input));
  return mapRehearsal(row);
}

export async function updateRehearsal(
  id: number,
  input: UpdateRehearsalRequest
): Promise<Rehearsal> {
  const existing = await getRehearsalById(id);
  const row = await rehearsalsRepo.updateRehearsal(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("Rehearsal not found");
  return mapRehearsal(row);
}

export async function deleteRehearsal(id: number): Promise<void> {
  const deleted = await rehearsalsRepo.deleteRehearsal(id);
  if (!deleted) throw new NotFoundError("Rehearsal not found");
}

function toDateString(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function mapRehearsal(row: rehearsalsRepo.RehearsalRow): Rehearsal {
  return {
    id: row.id,
    name: row.name,
    date: toDateString(row.date) ?? row.date,
    location: row.location ?? undefined,
    cost: row.cost ?? undefined,
    notes: row.notes ?? undefined,
    airtableId: row.airtable_id ?? undefined,
  };
}

function buildMutationInput(
  input: CreateRehearsalRequest | UpdateRehearsalRequest,
  existing?: Rehearsal
): rehearsalsRepo.RehearsalMutationInput {
  const name = input.name?.trim() ?? existing?.name;
  if (!name) throw new BadRequestError("name is required");
  const date = input.date ?? existing?.date;
  if (!date) throw new BadRequestError("date is required");
  return {
    name,
    date,
    location: input.location?.trim() ?? existing?.location,
    cost: input.cost ?? existing?.cost,
    notes: input.notes?.trim() ?? existing?.notes,
    gigIds: input.gigIds,
    airtableId: input.airtableId ?? existing?.airtableId,
  };
}
