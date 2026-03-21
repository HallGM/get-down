import type { CreateServiceRequest, Service, UpdateServiceRequest } from "@get-down/shared";
import * as servicesRepository from "../repository/services.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getServices(): Promise<Service[]> {
  const rows = await servicesRepository.readServices();
  return rows.map(mapService);
}

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

function mapService(row: {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  price_to_client: number | null;
  fee_per_person: number | null;
  number_of_people: number | null;
  extra_fee: number | null;
  extra_fee_description: string | null;
  is_band: boolean;
  is_dj: boolean;
  is_active: boolean;
  airtable_id: string | null;
}): Service {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? undefined,
    description: row.description ?? undefined,
    priceToClient: row.price_to_client ?? undefined,
    feePerPerson: row.fee_per_person ?? undefined,
    numberOfPeople: row.number_of_people ?? undefined,
    extraFee: row.extra_fee ?? undefined,
    extraFeeDescription: row.extra_fee_description ?? undefined,
    isBand: row.is_band,
    isDj: row.is_dj,
    isActive: row.is_active,
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

  return {
    name,
    category: trimOptional(input.category) ?? existing?.category,
    description: trimOptional(input.description) ?? existing?.description,
    priceToClient: input.priceToClient ?? existing?.priceToClient,
    feePerPerson: input.feePerPerson ?? existing?.feePerPerson,
    numberOfPeople: input.numberOfPeople ?? existing?.numberOfPeople,
    extraFee: input.extraFee ?? existing?.extraFee,
    extraFeeDescription: trimOptional(input.extraFeeDescription) ?? existing?.extraFeeDescription,
    isBand: input.isBand ?? existing?.isBand ?? false,
    isDj: input.isDj ?? existing?.isDj ?? false,
    isActive: input.isActive ?? existing?.isActive ?? true,
    airtableId: input.airtableId ?? existing?.airtableId,
  };
}