import type { AccountingSummary } from "@get-down/shared";
import * as repo from "../repository/accounting.js";
import { BadRequestError } from "../errors.js";
import { buildPersonName } from "../utils/people.js";

export interface SummaryParams {
  year?: number;
  taxYearStart?: number;
}

type DateBounds = { start: string | null; end: string | null };

// ─── Public entry point ───────────────────────────────────────────────────────

export async function getSummary(params: SummaryParams): Promise<AccountingSummary> {
  const bounds = resolveBounds(params);

  const [gigCounts, potPayments, potRefunds, earnedPayments, earnedRefunds, expenses, drawings] =
    await Promise.all([
      repo.readGigCounts(bounds),
      repo.readPotPayments(bounds),
      repo.readPotRefunds(bounds),
      repo.readEarnedPayments(bounds),
      repo.readEarnedRefunds(bounds),
      repo.readExpensesTotal(bounds),
      repo.readDrawings(bounds),
    ]);

  const potIncome     = potPayments - potRefunds;
  const earnedIncome  = earnedPayments - earnedRefunds;
  const drawingsTotal = drawings.reduce((sum, d) => sum + d.amount, 0);

  const potProfit        = potIncome - expenses;
  const taxableProfit    = earnedIncome - expenses;
  const potAfterDrawings = potProfit - drawingsTotal;
  const sharedProfit     = taxableProfit - drawingsTotal;

  return {
    gigsBooked:    gigCounts.booked,
    gigsPerformed: gigCounts.performed,
    potIncome,
    earnedIncome,
    expenses,
    potProfit,
    taxableProfit,
    drawingsTotal,
    drawingsBreakdown: drawings.map((d) => ({
      personId:   d.person_id,
      personName: buildPersonName(d),
      amount:     d.amount,
    })),
    potAfterDrawings,
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
      start: `${year}-01-01`,
      end:   `${year}-12-31`,
    };
  }

  if (taxYearStart !== undefined) {
    return {
      start: `${taxYearStart}-04-06`,
      end:   `${taxYearStart + 1}-04-05`,
    };
  }

  return { start: null, end: null };
}
