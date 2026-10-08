import { isEnquiryEmailRuleKey, type CreateEnquiryServiceRequest, type EnquiryService, type UpdateEnquiryServiceRequest } from "@get-down/shared";
import * as repo from "../repository/enquiry_services.js";
import * as gigsRepo from "../repository/gigs.js";
import { BadRequestError, ConflictError, NotFoundError } from "../errors.js";
import { isUniqueViolation } from "../errors.js";

export async function getAll(): Promise<EnquiryService[]> { return (await repo.readAll()).map(map); }
export async function create(input: CreateEnquiryServiceRequest): Promise<EnquiryService> {
  return withDuplicateNameHandling(() => repo.create(requireName(input.name)));
}
export async function update(id: number, input: UpdateEnquiryServiceRequest): Promise<EnquiryService> {
  return withDuplicateNameHandling(async () => {
    const row = await repo.update(id, requireName(input.name));
    if (!row) throw new NotFoundError("Enquiry service not found");
    return row;
  });
}
export async function remove(id: number): Promise<void> {
  try { if (!(await repo.remove(id))) throw new NotFoundError("Enquiry service not found"); }
  catch (error) { if ((error as { code?: string }).code === "23503") throw new ConflictError("This enquiry service is assigned to one or more gigs"); throw error; }
}
export async function getGigSelections(gigId: number): Promise<EnquiryService[]> {
  await requireGig(gigId);
  return (await repo.readGigSelections(gigId)).map(map);
}
export async function setGigSelections(gigId: number, ids: unknown): Promise<EnquiryService[]> {
  if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
    throw new BadRequestError("enquiryServiceIds must be an array of unique positive integers");
  }
  await requireGig(gigId);
  const all = await repo.readAll();
  if ((ids as number[]).some((id) => !all.some((s) => s.id === id))) {
    throw new BadRequestError("Unknown enquiry service");
  }
  await repo.replaceGigSelections(gigId, ids as number[]);
  return getGigSelections(gigId);
}
async function requireGig(gigId: number): Promise<void> {
  if (!(await gigsRepo.readGigById(gigId))) throw new NotFoundError("Gig not found");
}
async function withDuplicateNameHandling<T extends repo.EnquiryServiceRow>(operation: () => Promise<T>): Promise<EnquiryService> {
  try { return map(await operation()); }
  catch (error) { if (isUniqueViolation(error)) throw new ConflictError("An enquiry service with that name already exists"); throw error; }
}
function requireName(name: string): string { const value = name?.trim(); if (!value) throw new BadRequestError("name is required"); return value; }
function map(row: repo.EnquiryServiceRow): EnquiryService {
  if (row.email_rule_key !== null && !isEnquiryEmailRuleKey(row.email_rule_key)) {
    throw new Error(`Unknown enquiry email rule key: ${row.email_rule_key}`);
  }
  return { id: row.id, name: row.name, emailRuleKey: row.email_rule_key, usageCount: row.usage_count };
}
