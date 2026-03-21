import type { CreatePersonRequest, Person, UpdatePersonRequest } from "@get-down/shared";
import * as peopleRepository from "../repository/people.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getPeople(): Promise<Person[]> {
  const rows = await peopleRepository.readPeople();
  return rows.map(mapPerson);
}

export async function getPersonById(id: number): Promise<Person> {
  const row = await peopleRepository.readPersonById(id);
  if (!row) {
    throw new NotFoundError("Person not found");
  }

  return mapPerson(row);
}

export async function createPerson(input: CreatePersonRequest): Promise<Person> {
  validateCreateInput(input);

  const firstName = input.firstName.trim();
  const lastName = normalizeOptionalString(input.lastName);
  const displayName =
    normalizeOptionalString(input.displayName) ?? [firstName, lastName].filter(Boolean).join(" ");

  const row = await peopleRepository.createPerson({
    firstName,
    lastName,
    displayName,
    email: normalizeOptionalString(input.email)?.toLowerCase(),
    phone: normalizeOptionalString(input.phone),
    bankDetails: normalizeOptionalString(input.bankDetails),
    isPartner: input.isPartner ?? false,
    isActive: input.isActive ?? true,
    airtableId: input.airtableId,
  });

  return mapPerson(row);
}

export async function updatePerson(id: number, input: UpdatePersonRequest): Promise<Person> {
  const existing = await getPersonById(id);
  const updated = await peopleRepository.updatePerson(id, mergeUpdate(existing, input));
  if (!updated) {
    throw new NotFoundError("Person not found");
  }

  return mapPerson(updated);
}

export async function deletePerson(id: number): Promise<void> {
  const deleted = await peopleRepository.deletePerson(id);
  if (!deleted) {
    throw new NotFoundError("Person not found");
  }
}

function normalizeOptionalString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function mapPerson(row: {
  id: number;
  first_name: string;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  bank_details: string | null;
  is_partner: boolean;
  is_active: boolean;
  airtable_id: string | null;
}): Person {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? undefined,
    displayName: row.display_name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    bankDetails: row.bank_details ?? undefined,
    isPartner: row.is_partner,
    isActive: row.is_active,
    airtableId: row.airtable_id ?? undefined,
  };
}

function validateCreateInput(input: CreatePersonRequest): void {
  if (!input.firstName?.trim()) {
    throw new BadRequestError("firstName is required");
  }
}

function mergeUpdate(existing: Person, input: UpdatePersonRequest): peopleRepository.PersonUpdateInput {
  const firstName = normalizeOptionalString(input.firstName) ?? existing.firstName;
  if (!firstName) {
    throw new BadRequestError("firstName is required");
  }

  return {
    firstName,
    lastName: normalizeOptionalString(input.lastName) ?? existing.lastName,
    displayName:
      normalizeOptionalString(input.displayName) ??
      existing.displayName ??
      [firstName, normalizeOptionalString(input.lastName) ?? existing.lastName].filter(Boolean).join(" "),
    email: normalizeOptionalString(input.email) ?? existing.email,
    phone: normalizeOptionalString(input.phone) ?? existing.phone,
    bankDetails: normalizeOptionalString(input.bankDetails) ?? existing.bankDetails,
    isPartner: input.isPartner ?? existing.isPartner,
    isActive: input.isActive ?? existing.isActive,
    airtableId: input.airtableId ?? existing.airtableId,
  };
}