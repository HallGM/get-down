import type { CreateServiceRequest, Service, UpdateServiceRequest } from "@get-down/shared";
import * as servicesRepository from "../repository/services.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { z } from "zod";
import { parseOrBadRequest } from "../utils/parse.js";

const ServiceGroupsSchema = z.array(z.number().int().positive()).optional();

export async function getServices(): Promise<Service[]> {
  const rows = await servicesRepository.readServices();
  return rows.map(mapService);
}

export async function getServiceGroups() { return servicesRepository.readServiceGroups(); }

export async function getServiceById(id: number): Promise<Service> {
  const row = await servicesRepository.readServiceById(id);
  if (!row) {
    throw new NotFoundError("Service not found");
  }

  return mapService(row);
}

export async function createService(input: CreateServiceRequest): Promise<Service> {
  const row = await servicesRepository.createService(buildMutationInput(input));
  return mapService(row);
}

export async function updateService(id: number, input: UpdateServiceRequest): Promise<Service> {
  const existing = await getServiceById(id);
  const row = await servicesRepository.updateService(id, buildMutationInput(input, existing));
  if (!row) {
    throw new NotFoundError("Service not found");
  }

  return mapService(row);
}

export async function deleteService(id: number): Promise<void> {
  const deleted = await servicesRepository.deleteService(id);
  if (!deleted) {
    throw new NotFoundError("Service not found");
  }
}

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function mapService(row: servicesRepository.ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    priceToClient: row.price_to_client ?? undefined,
    numberOfPeople: row.number_of_people,
    profitMargin: row.profit_margin,
    timesUsed: row.times_used,
    extraFee: row.extra_fee ?? undefined,
    extraFeeDescription: row.extra_fee_description ?? undefined,
    groups: row.groups ?? [],
    airtableId: row.airtable_id ?? undefined,
  };
}

function buildMutationInput(
  input: CreateServiceRequest | UpdateServiceRequest,
  existing?: Service
): servicesRepository.ServiceMutationInput {
  const name = trimOptional(input.name) ?? existing?.name;
  if (!name) {
    throw new BadRequestError("name is required");
  }

  const groupIds = parseOrBadRequest(ServiceGroupsSchema, input.groupIds) ?? existing?.groups.map((group) => group.id) ?? [];

  return {
    name,
    description: trimOptional(input.description) ?? existing?.description,
    priceToClient: input.priceToClient ?? existing?.priceToClient,
    extraFee: input.extraFee ?? existing?.extraFee,
    extraFeeDescription: trimOptional(input.extraFeeDescription) ?? existing?.extraFeeDescription,
    groupIds,
    airtableId: input.airtableId ?? existing?.airtableId,
  };
}
