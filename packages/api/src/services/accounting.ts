import type { AccountingSummary } from "@get-down/shared";
import * as repo from "../repository/accounting.js";
import { BadRequestError } from "../errors.js";
import { buildPersonName } from "../utils/people.js";
import { PARTNERSHIP_START_DATE } from "../constants.js";

export interface SummaryParams {
  start?: string;
  end?: string;
}

type DateBounds = { start: string | null; end: string | null };

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Build the Accounting page summary for a period. See `./ACCOUNTING.md` for the
 * plain-English definition of every figure returned here, including exactly
 * what is settled vs predicted and whether partner fee allocations are
 * included or excluded from each figure.
 */
export async function getSummary(params: SummaryParams): Promise<AccountingSummary> {
  const bounds = resolveBounds(params);

  const [gigCounts, expensesBreakdown, partnerAllocations, predictedSummary, taxOnlyTotal] =
    await Promise.all([
      repo.readGigCounts(bounds),
      repo.readExpensesBreakdown(bounds),
      repo.readPartnerFeeAllocations(bounds),
      repo.readPredictedProfitSummary(bounds),
      repo.readTaxOnlyExpensesTotal(bounds),
    ]);

  const { settledNetReceived, predictedBillingUnsettled, predictedFeeAllocUnsettled, predictedSharedProfit, excludedCount } = predictedSummary;

  const expenses              = expensesBreakdown.feeAllocation + expensesBreakdown.showcase + expensesBreakdown.other;
  const businessProfit        = settledNetReceived - expenses;
  const feeAllocationsTotal   = partnerAllocations.reduce((sum, a) => sum + a.amount, 0);
  const confirmedSharedProfit = businessProfit - feeAllocationsTotal;
  const taxableProfit         = businessProfit - taxOnlyTotal;

  return {
    gigsBooked:    gigCounts.booked,
    gigsPerformed: gigCounts.performed,
    settledNetReceived,
    predictedBillingUnsettled,
    expenses,
    expensesBreakdown,
    predictedFeeAllocations: predictedFeeAllocUnsettled,
    businessProfit,
    feeAllocationsTotal,
    feeAllocationsBreakdown: partnerAllocations.map((a) => ({
      personId:   a.person_id,
      personName: buildPersonName(a),
      amount:     a.amount,
    })),
    confirmedSharedProfit,
    predictedSharedProfit,
    predictedProfitExcludedCount: excludedCount,
    taxOnlyExpensesTotal: taxOnlyTotal,
    taxableProfit,
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function resolveBounds(params: SummaryParams): DateBounds {
  const { start, end } = params;

  // Require both start/end or both absent
  if ((start !== undefined && end === undefined) || (start === undefined && end !== undefined)) {
    throw new BadRequestError("Provide both start and end, or neither");
  }

  // Validate start <= end if both provided
  if (start !== undefined && end !== undefined && start > end) {
    throw new BadRequestError("start date must not be after end date");
  }

  // Explicit range provided
  if (start !== undefined && end !== undefined) {
    return {
      start: floorToPartnershipStart(start),
      end,
    };
  }

  // "All time" — floor at the partnership start date.
  return { start: PARTNERSHIP_START_DATE, end: null };
}

function floorToPartnershipStart(date: string): string {
  return date < PARTNERSHIP_START_DATE ? PARTNERSHIP_START_DATE : date;
}
