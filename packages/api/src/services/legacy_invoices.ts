import { randomUUID } from "crypto";
import { extname } from "path";
import type { LegacyInvoice } from "@get-down/shared";
import * as legacyInvoicesRepo from "../repository/legacy_invoices.js";
import * as gigsRepo from "../repository/gigs.js";
import * as storage from "../utils/storage.js";
import { toDateString } from "../utils/date.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getLegacyInvoicesByGig(gigId: number): Promise<LegacyInvoice[]> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");

  const rows = await legacyInvoicesRepo.readLegacyInvoicesByGigId(gigId);
  return Promise.all(rows.map((row) => mapLegacyInvoice(row)));
}

export async function getLegacyInvoiceById(id: number): Promise<LegacyInvoice> {
  const row = await legacyInvoicesRepo.readLegacyInvoiceById(id);
  if (!row) throw new NotFoundError("Legacy invoice not found");
  return mapLegacyInvoice(row);
}

export async function createLegacyInvoice(
  gigId: number,
  invoiceNumber: string | null | undefined,
  date: string | null | undefined,
  description: string | null | undefined,
  buffer: Buffer,
  mimeType: string,
  originalFilename: string
): Promise<LegacyInvoice> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");

  // Generate a key and upload to R2
  const ext = extname(originalFilename);
  const key = `legacy-invoices/${gigId}/${randomUUID()}${ext}`;

  await storage.uploadFile(key, buffer, mimeType);

  try {
    const row = await legacyInvoicesRepo.createLegacyInvoice({
      gigId,
      invoiceNumber: invoiceNumber?.trim() ?? null,
      date: date ?? null,
      description: description?.trim() ?? null,
      documentKey: key,
    });

    return mapLegacyInvoice(row);
  } catch (err) {
    // If DB creation fails, clean up the uploaded file
    await storage.tryDeleteFile(key);
    throw err;
  }
}

export async function updateLegacyInvoice(
  id: number,
  invoiceNumber?: string | null,
  date?: string | null,
  description?: string | null
): Promise<LegacyInvoice> {
  const existing = await legacyInvoicesRepo.readLegacyInvoiceById(id);
  if (!existing) throw new NotFoundError("Legacy invoice not found");

  const row = await legacyInvoicesRepo.updateLegacyInvoice(id, {
    gigId: existing.gig_id,
    invoiceNumber: invoiceNumber?.trim() ?? null,
    date: date ?? null,
    description: description?.trim() ?? null,
    documentKey: existing.document_key ?? "",
  });

  if (!row) throw new NotFoundError("Legacy invoice not found");
  return mapLegacyInvoice(row);
}

export async function replaceLegacyInvoiceDocument(
  id: number,
  buffer: Buffer,
  mimeType: string,
  originalFilename: string
): Promise<void> {
  const row = await legacyInvoicesRepo.readLegacyInvoiceById(id);
  if (!row) throw new NotFoundError("Legacy invoice not found");

  // Upload new file first
  const ext = extname(originalFilename);
  const key = `legacy-invoices/${row.gig_id}/${randomUUID()}${ext}`;
  await storage.uploadFile(key, buffer, mimeType);

  // Update DB with new key
  await legacyInvoicesRepo.updateLegacyInvoice(id, {
    gigId: row.gig_id,
    invoiceNumber: row.invoice_number ?? null,
    date: row.date ?? null,
    description: row.description ?? null,
    documentKey: key,
  });

  // Now safe to delete old file (best-effort)
  if (row.document_key) {
    await storage.tryDeleteFile(row.document_key);
  }
}

export async function deleteLegacyInvoice(id: number): Promise<void> {
  const row = await legacyInvoicesRepo.readLegacyInvoiceById(id);
  if (!row) throw new NotFoundError("Legacy invoice not found");

  // Delete the file first (best-effort)
  if (row.document_key) {
    await storage.tryDeleteFile(row.document_key);
  }

  // Then delete the DB record
  const deleted = await legacyInvoicesRepo.deleteLegacyInvoice(id);
  if (!deleted) throw new NotFoundError("Legacy invoice not found");
}

// ─── Private helpers ──────────────────────────────────────────────────────

async function mapLegacyInvoice(row: legacyInvoicesRepo.LegacyInvoiceRow): Promise<LegacyInvoice> {
  const documentUrl = await storage.tryGetPresignedUrl(row.document_key);
  return {
    id: row.id,
    gigId: row.gig_id,
    invoiceNumber: row.invoice_number ?? undefined,
    date: toDateString(row.date) ?? undefined,
    description: row.description ?? undefined,
    documentUrl,
  };
}
