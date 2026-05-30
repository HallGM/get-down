import type { Rehearsal, CreateRehearsalRequest, UpdateRehearsalRequest } from "@get-down/shared";
import * as rehearsalsRepo from "../repository/rehearsals.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { withTransaction } from "../db/init.js";

export async function getRehearsals(): Promise<Rehearsal[]> {
  const rows = await rehearsalsRepo.readRehearsals();
  return rows.map(mapRehearsal);
}

export async function getRehearsalById(id: number): Promise<Rehearsal> {
  const row = await rehearsalsRepo.readRehearsalById(id);
  if (!row) throw new NotFoundError("Rehearsal not found");
  return mapRehearsal(row);
}

export async function getRehearsalsByGigId(gigId: number): Promise<Rehearsal[]> {
  const rows = await rehearsalsRepo.readRehearsalsByGigId(gigId);
  return rows.map(mapRehearsalWithGig);
}

export async function createRehearsal(input: CreateRehearsalRequest): Promise<Rehearsal> {
  const row = await rehearsalsRepo.createRehearsal(buildMutationInput(input));
  return mapRehearsal(row);
}

/**
 * Creates a rehearsal and links it to gigId plus any additional gigIds.
 * Automatically sets cost_share for each gig link:
 *   - Even split (floor) across all gigs; remainder goes to the first gig.
 *   - If no cost is set, cost_share is null on all links.
 */
export async function createRehearsalForGig(
  gigId: number,
  input: CreateRehearsalRequest
): Promise<Rehearsal> {
  return withTransaction(async () => {
    const allGigIds = [gigId, ...(input.gigIds ?? []).filter((id) => id !== gigId)];
    const mutationInput = buildMutationInput(input);
    const row = await rehearsalsRepo.createRehearsal(mutationInput);

    const shares = computeEvenSplit(input.cost, allGigIds.length);
    for (let i = 0; i < allGigIds.length; i++) {
      await rehearsalsRepo.linkRehearsalToGig(row.id, allGigIds[i], shares[i]);
    }

    return mapRehearsal(row);
  });
}

export async function updateRehearsal(
  id: number,
  input: UpdateRehearsalRequest
): Promise<Rehearsal> {
  return withTransaction(async () => {
    const existing = await getRehearsalById(id);
    const row = await rehearsalsRepo.updateRehearsal(id, buildMutationInput(input, existing));
    if (!row) throw new NotFoundError("Rehearsal not found");

    // If cost changed and rehearsal has exactly one gig link, auto-sync cost_share
    const newCost = input.cost !== undefined ? input.cost : existing.cost;
    if (input.cost !== undefined && input.cost !== existing.cost) {
      const links = await rehearsalsRepo.getGigLinksForRehearsal(id);
      if (links.length === 1) {
        await rehearsalsRepo.updateCostShare(id, links[0].gig_id, newCost ?? null);
      }
      // For multiple gigs, preserve existing shares (mismatch warning shown in UI)
    }

    return mapRehearsal(row);
  });
}

export async function deleteRehearsal(id: number): Promise<void> {
  const deleted = await rehearsalsRepo.deleteRehearsal(id);
  if (!deleted) throw new NotFoundError("Rehearsal not found");
}

/**
 * Links an existing rehearsal to a gig.
 * Rebalances all cost_share values to an even split of the current rehearsal cost.
 */
export async function linkRehearsalToGig(
  rehearsalId: number,
  gigId: number
): Promise<void> {
  return withTransaction(async () => {
    const rehearsal = await rehearsalsRepo.readRehearsalById(rehearsalId);
    if (!rehearsal) throw new NotFoundError("Rehearsal not found");

    // Check not already linked
    const existingLinks = await rehearsalsRepo.getGigLinksForRehearsal(rehearsalId);
    if (existingLinks.some((l) => l.gig_id === gigId)) {
      throw new BadRequestError("Rehearsal is already linked to this gig");
    }

    const allGigIds = [...existingLinks.map((l) => l.gig_id), gigId];
    const shares = computeEvenSplit(rehearsal.cost ?? undefined, allGigIds.length);

    // Update existing links with new even-split shares
    for (let i = 0; i < existingLinks.length; i++) {
      await rehearsalsRepo.updateCostShare(rehearsalId, existingLinks[i].gig_id, shares[i]);
    }

    // Insert new link
    await rehearsalsRepo.linkRehearsalToGig(rehearsalId, gigId, shares[allGigIds.length - 1]);
  });
}

/**
 * Unlinks a rehearsal from a gig. Deletes the rehearsal entirely if it becomes orphaned.
 */
export async function unlinkRehearsalFromGig(
  rehearsalId: number,
  gigId: number
): Promise<void> {
  return withTransaction(async () => {
    const rehearsal = await rehearsalsRepo.readRehearsalById(rehearsalId);
    if (!rehearsal) throw new NotFoundError("Rehearsal not found");

    await rehearsalsRepo.unlinkRehearsalFromGig(rehearsalId, gigId);

    const remaining = await rehearsalsRepo.getGigLinksForRehearsal(rehearsalId);
    if (remaining.length === 0) {
      await rehearsalsRepo.deleteRehearsal(rehearsalId);
    }
  });
}

/**
 * Updates the cost_share for a specific gig link. Validates that the new value,
 * combined with all other existing sibling shares, still sums to rehearsal.cost.
 */
export async function updateCostShare(
  rehearsalId: number,
  gigId: number,
  costShare: number
): Promise<void> {
  return withTransaction(async () => {
    const rehearsal = await rehearsalsRepo.readRehearsalById(rehearsalId);
    if (!rehearsal) throw new NotFoundError("Rehearsal not found");

    const links = await rehearsalsRepo.getGigLinksForRehearsal(rehearsalId);
    const thisLink = links.find((l) => l.gig_id === gigId);
    if (!thisLink) throw new NotFoundError("Rehearsal is not linked to this gig");

    if (rehearsal.cost != null) {
      const siblingSum = links
        .filter((l) => l.gig_id !== gigId)
        .reduce((sum, l) => sum + (l.cost_share ?? 0), 0);
      assertSharesSumToCost(siblingSum + costShare, rehearsal.cost);
    }

    await rehearsalsRepo.updateCostShare(rehearsalId, gigId, costShare);
  });
}

export async function setRehearsalExpense(
  rehearsalId: number,
  expenseId: number | null
): Promise<void> {
  const rehearsal = await rehearsalsRepo.readRehearsalById(rehearsalId);
  if (!rehearsal) throw new NotFoundError("Rehearsal not found");
  await rehearsalsRepo.setRehearsalExpense(rehearsalId, expenseId);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assertSharesSumToCost(total: number, cost: number): void {
  if (total !== cost) {
    throw new BadRequestError(
      `Cost shares must sum to the total rehearsal cost (${cost}p). Got ${total}p.`
    );
  }
}

/**
 * Returns an array of cost_share values (in pence) for N gigs.
 * Uses floor division; the remainder is added to the first gig.
 * Returns array of nulls if cost is undefined/null.
 */
function computeEvenSplit(cost: number | undefined, n: number): (number | null)[] {
  if (cost == null || n === 0) return Array(n).fill(null);
  if (n === 1) return [cost];
  const share = Math.floor(cost / n);
  const remainder = cost - share * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? share + remainder : share));
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
    expenseId: row.expense_id ?? undefined,
  };
}

function mapRehearsalWithGig(row: rehearsalsRepo.RehearsalWithGigRow): Rehearsal {
  return {
    ...mapRehearsal(row),
    costShare: row.cost_share ?? undefined,
    gigCount: row.gig_count,
    expenseDescription: row.expense_description ?? undefined,
    expenseAmount: row.expense_amount ?? undefined,
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
