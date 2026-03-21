import type {
  Attribution,
  CreateAttributionRequest,
  UpdateAttributionRequest,
} from "@get-down/shared";
import * as attributionsRepo from "../repository/attributions.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getAttributions(): Promise<Attribution[]> {
  const rows = await attributionsRepo.readAttributions();
  return rows.map(mapAttribution);
}

export async function getAttributionById(id: number): Promise<Attribution> {
  const row = await attributionsRepo.readAttributionById(id);
  if (!row) throw new NotFoundError("Attribution not found");
  return mapAttribution(row);
}

export async function createAttribution(input: CreateAttributionRequest): Promise<Attribution> {
  const row = await attributionsRepo.createAttribution(buildMutationInput(input));
  return mapAttribution(row);
}

export async function updateAttribution(
  id: number,
  input: UpdateAttributionRequest
): Promise<Attribution> {
  const existing = await getAttributionById(id);
  const row = await attributionsRepo.updateAttribution(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("Attribution not found");
  return mapAttribution(row);
}

export async function deleteAttribution(id: number): Promise<void> {
  const deleted = await attributionsRepo.deleteAttribution(id);
  if (!deleted) throw new NotFoundError("Attribution not found");
}

function mapAttribution(row: {
  id: number;
  name: string;
  type: string;
  notes: string | null;
  airtable_id: string | null;
}): Attribution {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    notes: row.notes ?? undefined,
    airtableId: row.airtable_id ?? undefined,
  };
}

function buildMutationInput(
  input: CreateAttributionRequest | UpdateAttributionRequest,
  existing?: Attribution
): attributionsRepo.AttributionMutationInput {
  const name = input.name?.trim() || existing?.name;
  if (!name) throw new BadRequestError("name is required");
  const type = input.type?.trim() || existing?.type;
  if (!type) throw new BadRequestError("type is required");

  return {
    name,
    type,
    notes: input.notes?.trim() || existing?.notes,
    airtableId: input.airtableId ?? existing?.airtableId,
  };
}
