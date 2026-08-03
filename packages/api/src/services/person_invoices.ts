import { z } from "zod";
import type {
  PersonInvoice,
  PersonInvoiceLineItem,
} from "@get-down/shared";
import { resolvePersonName } from "@get-down/shared";
import * as personInvoicesRepo from "../repository/person_invoices.js";
import * as peopleRepo from "../repository/people.js";
import * as gigsRepo from "../repository/gigs.js";
import * as expensesRepo from "../repository/expenses.js";
import * as peopleService from "./people.js";
import { withTransaction } from "../db/init.js";
import { parseOrBadRequest } from "../utils/parse.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { toDateString, todayDate } from "../utils/date.js";
import { resolvePersonRowName } from "../utils/person.js";
import { formatGigName, requireGig } from "../utils/gig.js";

const CreatePersonInvoiceSchema = z.object({
  personId: z.number().int(),
  date: z.string().min(1, "date is required"),
  lineItems: z.array(
    z.object({
      description: z.string().min(1, "description is required"),
      amount: z.number().int().positive("amount must be positive"),
    })
  ).min(1, "at least one line item is required"),
  gigId: z.number().int().positive().optional(),
});

const UpdatePersonInvoiceSchema = z.object({
  date: z.string().min(1, "date is required").optional(),
  lineItems: z.array(
    z.object({
      description: z.string().min(1, "description is required"),
      amount: z.number().int().positive("amount must be positive"),
    })
  ).min(1, "at least one line item is required").optional(),
});

export async function getAllPersonInvoices(): Promise<PersonInvoice[]> {
  const rows = await personInvoicesRepo.readAllPersonInvoices();
  const promises = rows.map(async (row) => withSubresources(mapPersonInvoice(row)));
  return Promise.all(promises);
}

export async function getPersonInvoicesByPersonId(personId: number): Promise<PersonInvoice[]> {
  // Verify person exists
  const person = await peopleRepo.readPersonById(personId);
  if (!person) throw new NotFoundError("Person not found");

  const rows = await personInvoicesRepo.readPersonInvoicesByPersonId(personId);
  const promises = rows.map(async (row) => withSubresources(mapPersonInvoice(row)));
  return Promise.all(promises);
}

export async function getPersonInvoiceById(id: number): Promise<PersonInvoice> {
  const row = await personInvoicesRepo.readPersonInvoiceById(id);
  if (!row) throw new NotFoundError("Person invoice not found");
  return withSubresources(mapPersonInvoice(row));
}

export async function createPersonInvoice(body: unknown): Promise<PersonInvoice> {
  const input = parseOrBadRequest(CreatePersonInvoiceSchema, body);

  // Verify person exists
  const person = await peopleRepo.readPersonById(input.personId);
  if (!person) throw new NotFoundError("Person not found");

  // Verify gig exists if provided
  if (input.gigId != null) {
    await requireGig(input.gigId);
  }

  assertPersonHasInvoiceDetails(
    {
      addressLine1: person.address_line_1,
      phone: person.phone,
      email: person.email,
      accountNumber: person.account_number,
      sortCode: person.sort_code,
    },
    resolvePersonRowName(person)
  );

  return createPersonInvoiceWithDetails(input.personId, input.lineItems, input.date, person, input.gigId);
}

/**
 * Create a person invoice from fee allocation line items.
 * Used by the fee allocation invoice generation feature.
 */
export async function createPersonInvoiceFromAllocationLineItems(
  personId: number,
  lineItems: Array<{ description?: string; amount: number }>,
  gigId?: number
): Promise<PersonInvoice> {
  // Defense-in-depth: the current caller (fee_allocations.generateInvoiceForAllocation)
  // already validates this, but this function is exported and may gain other callers.
  if (!lineItems || lineItems.length === 0) {
    throw new BadRequestError("at least one line item is required");
  }

  // Verify person exists
  const person = await peopleRepo.readPersonById(personId);
  if (!person) throw new NotFoundError("Person not found");

  assertPersonHasInvoiceDetails(
    {
      addressLine1: person.address_line_1,
      phone: person.phone,
      email: person.email,
      accountNumber: person.account_number,
      sortCode: person.sort_code,
    },
    resolvePersonRowName(person)
  );

  // Use today's date
  const date = todayDate();

  return createPersonInvoiceWithDetails(personId, lineItems, date, person, gigId);
}

// ─── Private helpers ─────────────────────────────────────────────────────────

/**
 * Verify a person has the details required to generate an invoice PDF for them
 * (address, phone, email, account number, sort code). Used both when creating a
 * person invoice and when generating its PDF, so staff get a clear error as early
 * as possible rather than discovering the gap only at PDF-generation time.
 */
function assertPersonHasInvoiceDetails(person: {
  addressLine1?: string | null;
  phone?: string | null;
  email?: string | null;
  accountNumber?: string | null;
  sortCode?: string | null;
}, businessName: string, context: "invoice" | "invoice PDF" = "invoice"): void {
  const missingFields: string[] = [];
  if (!person.addressLine1) missingFields.push("address line 1");
  if (!person.phone) missingFields.push("phone number");
  if (!person.email) missingFields.push("email address");
  if (!person.accountNumber) missingFields.push("account number");
  if (!person.sortCode) missingFields.push("sort code");
  if (missingFields.length > 0) {
    throw new BadRequestError(
      `Cannot generate ${context}: ${businessName} is missing ${missingFields.join(", ")}. Update the person's details first.`
    );
  }
}

async function createPersonInvoiceWithDetails(
  personId: number,
  lineItems: Array<{ description?: string | null; amount: number }>,
  date: string,
  person: NonNullable<Awaited<ReturnType<typeof peopleRepo.readPersonById>>>,
  gigId?: number
): Promise<PersonInvoice> {
  return withTransaction(async () => {
    // Calculate total
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Create linked expense
    const expenseDescription = `Person Invoice: ${resolvePersonRowName(person)}`;
    const expenseRow = await expensesRepo.createExpense({
      date,
      amount: totalAmount,
      description: expenseDescription,
      recipientName: resolvePersonRowName(person),
    });

    // Get next invoice number from sequence (atomically generated by database)
    const sequenceResult = await personInvoicesRepo.readNextInvoiceNumber();
    const invoiceNumber = sequenceResult?.next_person_invoice_number ?? "EA-0001";

    // Create person invoice
    const invoiceRow = await personInvoicesRepo.createPersonInvoice({
      personId,
      invoiceNumber,
      date,
      totalAmount,
      expenseId: expenseRow.id,
      gigId,
    });

    // Create line items
    await Promise.all(
      lineItems.map((item) =>
        personInvoicesRepo.createLineItem(invoiceRow.id, item.description ?? null, item.amount)
      )
    );

    return withSubresources(mapPersonInvoice(invoiceRow));
  });
}

export async function updatePersonInvoice(id: number, body: unknown): Promise<PersonInvoice> {
  const input = parseOrBadRequest(UpdatePersonInvoiceSchema, body);

  const existing = await getPersonInvoiceById(id);
  const date = input.date ?? existing.date;
  const lineItems = input.lineItems ?? (existing.lineItems ?? []).map((li) => ({
    description: li.description ?? "",
    amount: li.amount ?? 0,
  }));

  // Validate at least one line item
  if (!lineItems || lineItems.length === 0) {
    throw new BadRequestError("at least one line item is required");
  }

  return withTransaction(async () => {
    // Calculate new total
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Update linked expense
    const person = await peopleRepo.readPersonById(existing.personId);
    if (!person) throw new NotFoundError("Person not found");

    const expenseDescription = `Person Invoice: ${resolvePersonRowName(person)}`;
    await expensesRepo.updateExpense(existing.expenseId, {
      date,
      amount: totalAmount,
      description: expenseDescription,
      recipientName: resolvePersonRowName(person),
    });

    // Update invoice
    const invoiceRow = await personInvoicesRepo.updatePersonInvoice(id, date, totalAmount);
    if (!invoiceRow) throw new NotFoundError("Person invoice not found");

    // Replace line items
    await personInvoicesRepo.deleteLineItemsByPersonInvoiceId(id);
    await Promise.all(
      lineItems.map((item) =>
        personInvoicesRepo.createLineItem(id, item.description, item.amount)
      )
    );

    return withSubresources(mapPersonInvoice(invoiceRow));
  });
}

export async function deletePersonInvoice(id: number): Promise<void> {
  const existing = await getPersonInvoiceById(id);

  // Check if the linked expense has any payments
  const hasPayments = await expensesRepo.hasPayments(existing.expenseId);
  if (hasPayments) {
    throw new BadRequestError("Cannot delete invoice with linked payments");
  }

  return withTransaction(async () => {
    // Delete the person invoice (line items cascade)
    const deleted = await personInvoicesRepo.deletePersonInvoice(id);
    if (!deleted) throw new NotFoundError("Person invoice not found");

    // Delete the linked expense (which will cascade to any expense_payments)
    await expensesRepo.deleteExpense(existing.expenseId);
  });
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function mapPersonInvoice(row: {
  id: number;
  person_id: number;
  invoice_number: string;
  date: string;
  total_amount: number;
  expense_id: number;
  gig_id: number | null;
}): PersonInvoice {
  return {
    id: row.id,
    personId: row.person_id,
    invoiceNumber: row.invoice_number,
    date: toDateString(row.date) ?? row.date,
    totalAmount: row.total_amount,
    expenseId: row.expense_id,
    gigId: row.gig_id ?? undefined,
  };
}

function mapPersonInvoiceLineItem(row: {
  id: number;
  person_invoice_id: number;
  description: string | null;
  amount: number | null;
}): PersonInvoiceLineItem {
  return {
    id: row.id,
    personInvoiceId: row.person_invoice_id,
    description: row.description ?? undefined,
    amount: row.amount ?? undefined,
  };
}

async function withSubresources(invoice: PersonInvoice): Promise<PersonInvoice> {
  const lineItems = await personInvoicesRepo.readLineItemsByPersonInvoiceId(invoice.id);
  return {
    ...invoice,
    lineItems: lineItems.map(mapPersonInvoiceLineItem),
  };
}

/**
 * Build a Flask /generate-generic payload for a person invoice PDF.
 * Requires the invoice with line items loaded (use withSubresources or getPersonInvoiceById).
 */
export async function buildFlaskPayloadForPersonInvoice(invoiceId: number): Promise<Record<string, unknown>> {
  const invoice = await getPersonInvoiceById(invoiceId);
  const person = await peopleService.getPersonById(invoice.personId);

  const businessName = resolvePersonName({
    businessName: person.businessName,
    displayName: person.displayName,
    firstName: person.firstName,
    lastName: person.lastName,
  });

  // The PDF service requires these fields to be set; check up-front and give a clear
  // error instead of letting the Flask request fail with a generic 400.
  assertPersonHasInvoiceDetails(person, businessName, "invoice PDF");

  // Every Angle's address is sourced from environment variables (same as Flask-side)
  const evAddressLine1 = process.env.BUSINESS_ADDRESS_LINE1 || "";
  const evAddressLine2 = process.env.BUSINESS_ADDRESS_LINE2 || "";
  const evAddressLine3 = process.env.BUSINESS_ADDRESS_LINE3 || "";
  const evAddressLine4 = process.env.BUSINESS_ADDRESS_LINE4 || "";
  const evAddressLine5 = process.env.BUSINESS_ADDRESS_LINE5 || "";

  const payload: Record<string, unknown> = {
    invoice_number: invoice.invoiceNumber,
    title: "Invoice",
    business_name: businessName,
    address_line_1: person.addressLine1 ?? "",
    address_line_2: person.addressLine2 ?? "",
    address_line_3: person.addressTown ?? "",
    address_line_4: person.addressCounty ?? "",
    address_line_5: person.addressPostcode ?? "",
    phone_number: person.phone ?? "",
    email_address: person.email ?? "",
    account_number: person.accountNumber ?? "",
    sort_code: person.sortCode ?? "",
    customer_name: "Every Angle",
    // Every Angle's address (customer address)
    customer_address_lines: [
      evAddressLine1,
      evAddressLine2,
      evAddressLine3,
      evAddressLine4,
      evAddressLine5,
    ].filter(Boolean),
    // Invoice date (not generation date)
    date: invoice.date,
    // Don't show contact line for person invoices
    show_contact_line: false,
    line_items: (invoice.lineItems ?? []).map((item) => ({
      description: item.description ?? "",
      price: (item.amount ?? 0) / 100,
    })),
  };

  // Add gig details if invoice is linked to a gig
  if (invoice.gigId) {
    const gig = await gigsRepo.readGigById(invoice.gigId);
    if (gig) {
      const gigName = formatGigName(gig);
      const gigDate = toDateString(gig.date) ?? gig.date;
      const gigVenue = gig.venue_name ?? gig.location ?? "";
      
      payload.gig_name = gigName;
      payload.gig_date = gigDate;
      payload.gig_venue = gigVenue;
    }
  }

  return payload;
}
