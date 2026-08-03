import { NotFoundError } from "../errors.js";
import * as gigsRepo from "../repository/gigs.js";

export interface GigDisplayFields {
  first_name?: string | null;
  last_name?: string | null;
  date?: string | null;
  venue_name?: string | null;
  location?: string | null;
}

/**
 * Format gig name by combining first_name and last_name with proper spacing and trimming.
 */
export function formatGigName(row: GigDisplayFields): string {
  return `${row.first_name ?? ""}${row.last_name ? ` ${row.last_name}` : ""}`.trim();
}

/**
 * Format a date string (ISO or otherwise) for user-friendly display.
 * e.g. "2025-06-14" → "14 June 2025"
 */
export function formatGigDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "";
  
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return String(dateValue);
  
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "long" });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Verify a gig exists by ID, throw NotFoundError if not found.
 * Useful for defense-in-depth validation when a gigId is provided.
 */
export async function requireGig(gigId: number): Promise<void> {
  const gig = await gigsRepo.readGigById(gigId);
  if (!gig) throw new NotFoundError("Gig not found");
}
