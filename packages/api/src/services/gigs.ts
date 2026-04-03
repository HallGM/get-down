import type { Gig, GigLineItem, Service, CreateGigRequest, UpdateGigRequest, CreateGigLineItemRequest } from "@get-down/shared";
import * as gigsRepo from "../repository/gigs.js";
import * as gigLineItemsRepo from "../repository/gig_line_items.js";
import * as paymentsRepo from "../repository/payments.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getGigs(): Promise<Gig[]> {
  const rows = await gigsRepo.readGigs();
  return rows.map(mapGig);
}

export async function getGigById(id: number): Promise<Gig> {
  const [row, lineItems, services, payments] = await Promise.all([
    gigsRepo.readGigById(id),
    gigLineItemsRepo.readGigLineItemsByGigId(id),
    gigsRepo.readGigServicesByGigId(id),
    paymentsRepo.readPaymentsByGigId(id),
  ]);
  if (!row) throw new NotFoundError("Gig not found");

  const subtotal = lineItems.reduce((sum, li) => sum + (li.amount ?? 0), 0);
  const discountAmount = Math.round(subtotal * row.discount_percent / 100);
  const total = subtotal - discountAmount + row.travel_cost;
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const depositRate = 0.20;
  const depositRequired = Math.round(total * depositRate);
  const depositPaid = Math.min(totalPaid, depositRequired);
  const balanceAmount = Math.max(0, total - totalPaid);

  return {
    ...mapGig(row),
    depositPaid,
    balanceAmount,
    lineItems: lineItems.map(mapGigLineItem),
    services: services.map(mapGigService),
  };
}

export async function createGig(input: CreateGigRequest): Promise<Gig> {
  const row = await gigsRepo.createGig(buildMutationInput(input));
  return mapGig(row);
}

export async function updateGig(id: number, input: UpdateGigRequest): Promise<Gig> {
  const existing = await gigsRepo.readGigById(id);
  if (!existing) throw new NotFoundError("Gig not found");
  const row = await gigsRepo.updateGig(id, buildMutationInput(input, mapGig(existing)));
  if (!row) throw new NotFoundError("Gig not found");
  return getGigById(id);
}

export async function deleteGig(id: number): Promise<void> {
  const deleted = await gigsRepo.deleteGig(id);
  if (!deleted) throw new NotFoundError("Gig not found");
}

export async function addGigLineItem(
  gigId: number,
  input: CreateGigLineItemRequest
): Promise<GigLineItem> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");
  const row = await gigLineItemsRepo.createGigLineItem(
    gigId,
    input.description?.trim() ?? null,
    input.amount ?? null
  );
  return mapGigLineItem(row);
}

export async function removeGigLineItem(gigId: number, lineItemId: number): Promise<void> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");
  const deleted = await gigLineItemsRepo.deleteGigLineItem(lineItemId);
  if (!deleted) throw new NotFoundError("Line item not found");
}

export async function setGigServices(gigId: number, serviceIds: number[]): Promise<void> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");
  await gigsRepo.setGigServices(gigId, serviceIds);
}

export async function generateLineItemsFromServices(gigId: number): Promise<GigLineItem[]> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");
  const services = await gigsRepo.readGigServicesByGigId(gigId);
  const created = await Promise.all(
    services.map((s) =>
      gigLineItemsRepo.createGigLineItem(gigId, s.name, s.price_to_client ?? 0)
    )
  );
  return created.map(mapGigLineItem);
}

export async function convertEnquiryToGig(enquiryId: number): Promise<Gig> {
  const enquiry = await gigsRepo.readEnquiryBrief(enquiryId);
  if (!enquiry) throw new NotFoundError("Enquiry not found");
  if (!enquiry.event_date) {
    throw new BadRequestError("Enquiry has no event date — cannot convert to gig");
  }

  const row = await gigsRepo.createGig({
    enquiryId: enquiry.id,
    status: "draft",
    firstName: enquiry.first_name,
    lastName: enquiry.last_name,
    partnerName: enquiry.partner_name ?? undefined,
    email: enquiry.email,
    phone: enquiry.phone ?? undefined,
    date: toDateString(enquiry.event_date) ?? enquiry.event_date,
    location: enquiry.venue_location ?? undefined,
    travelCost: 0,
    discountPercent: 0,
  });
  return mapGig(row);
}

function toDateString(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function mapGig(row: gigsRepo.GigRow): Gig {
  return {
    id: row.id,
    enquiryId: row.enquiry_id ?? undefined,
    attributionId: row.attribution_id ?? undefined,
    name: row.name ?? undefined,
    status: row.status,
    firstName: row.first_name,
    lastName: row.last_name,
    partnerName: row.partner_name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    date: toDateString(row.date) ?? row.date,
    venueName: row.venue_name ?? undefined,
    location: row.location ?? undefined,
    description: row.description ?? undefined,
    totalPrice: row.total_price ?? undefined,
    travelCost: row.travel_cost,
    discountPercent: row.discount_percent,
    airtableId: row.airtable_id ?? undefined,
  };
}

function mapGigLineItem(row: gigLineItemsRepo.GigLineItemRow): GigLineItem {
  return {
    id: row.id,
    gigId: row.gig_id,
    description: row.description ?? undefined,
    amount: row.amount ?? undefined,
  };
}

function mapGigService(row: gigsRepo.GigServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    priceToClient: row.price_to_client ?? undefined,
  };
}

function buildMutationInput(
  input: CreateGigRequest | UpdateGigRequest,
  existing?: Gig
): gigsRepo.GigMutationInput {
  const firstName = input.firstName?.trim() ?? existing?.firstName;
  if (!firstName) throw new BadRequestError("firstName is required");
  const lastName = input.lastName?.trim() ?? existing?.lastName;
  if (!lastName) throw new BadRequestError("lastName is required");
  const date = input.date ?? existing?.date;
  if (!date) throw new BadRequestError("date is required");

  return {
    enquiryId: input.enquiryId ?? existing?.enquiryId,
    attributionId: input.attributionId ?? existing?.attributionId,
    name: input.name?.trim() ?? existing?.name,
    status: input.status ?? existing?.status ?? "draft",
    firstName,
    lastName,
    partnerName: input.partnerName?.trim() ?? existing?.partnerName,
    email: input.email?.trim() ?? existing?.email,
    phone: input.phone?.trim() ?? existing?.phone,
    date,
    venueName: input.venueName?.trim() ?? existing?.venueName,
    location: input.location?.trim() ?? existing?.location,
    description: input.description?.trim() ?? existing?.description,
    totalPrice: input.totalPrice ?? existing?.totalPrice,
    // Preserve existing billing settings when partial updates omit them.
    travelCost: input.travelCost ?? existing?.travelCost ?? 0,
    discountPercent: input.discountPercent ?? existing?.discountPercent ?? 0,
    airtableId: input.airtableId ?? existing?.airtableId,
  };
}
