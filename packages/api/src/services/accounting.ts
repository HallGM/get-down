import type { AccountingSummary } from "@get-down/shared";
import * as repo from "../repository/accounting.js";
import { BadRequestError } from "../errors.js";
import { buildPersonName } from "../utils/people.js";
import { PARTNERSHIP_START_DATE } from "../constants.js";

export interface SummaryParams {
  year?: number;
  taxYearStart?: number;
}

type DateBounds = { start: string | null; end: string | null };

// ─── Public entry point ───────────────────────────────────────────────────────

export async function getSummary(params: SummaryParams): Promise<AccountingSummary> {
  const bounds = resolveBounds(params);

  const [gigCounts, earnedPayments, earnedRefunds, expenses, expensesBreakdown, partnerAllocations] =
    await Promise.all([
      repo.readGigCounts(bounds),
      repo.readEarnedPayments(bounds),
      repo.readEarnedRefunds(bounds),
      repo.readExpensesTotal(bounds),
      repo.readExpensesBreakdown(bounds),
      repo.readPartnerFeeAllocations(bounds),
    ]);

  const earnedIncome        = earnedPayments - earnedRefunds;
  const profit              = earnedIncome - expenses;
  const feeAllocationsTotal = partnerAllocations.reduce((sum, a) => sum + a.amount, 0);
  const sharedProfit        = profit - feeAllocationsTotal;

  return {
    gigsBooked:    gigCounts.booked,
    gigsPerformed: gigCounts.performed,
    earnedIncome,
    expenses,
    expensesBreakdown,
    profit,
    feeAllocationsTotal,
    feeAllocationsBreakdown: partnerAllocations.map((a) => ({
      personId:   a.person_id,
      personName: buildPersonName(a),
      amount:     a.amount,
    })),
    sharedProfit,
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function resolveBounds(params: SummaryParams): DateBounds {
  const { year, taxYearStart } = params;

  if (year !== undefined && taxYearStart !== undefined) {
    throw new BadRequestError("Provide either year or taxYearStart, not both");
  }

  if (year !== undefined) {
    return {
      start: floorToPartnershipStart(`${year}-01-01`),
      end:   `${year}-12-31`,
    };
  }

  if (taxYearStart !== undefined) {
    return {
      start: floorToPartnershipStart(`${taxYearStart}-04-06`),
      end:   `${taxYearStart + 1}-04-05`,
    };
  }

  // "All time" — floor at the partnership start date.
  return { start: PARTNERSHIP_START_DATE, end: null };
}

function floorToPartnershipStart(date: string): string {
  return date < PARTNERSHIP_START_DATE ? PARTNERSHIP_START_DATE : date;
}
