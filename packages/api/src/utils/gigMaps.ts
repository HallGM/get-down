import type {
  GigFinancialTotalsRow,
  GigPredictedProfitRow,
  GigSettledStatusRow,
} from "../repository/gigs.js";

/**
 * Build the three lookup maps used when assembling gig financial data in
 * service layer functions. Single source of truth for both the gig list
 * and showcase financial computations.
 */
export function buildGigMaps(
  financials: GigFinancialTotalsRow[],
  predictedProfits: GigPredictedProfitRow[],
  settledStatuses: GigSettledStatusRow[],
) {
  return {
    financialMap:       new Map(financials.map((f) => [f.gig_id, { netReceived: f.net_received, feesTotal: f.total_fees, billingTotal: f.billing_total }])),
    predictedProfitMap: new Map(predictedProfits.map((p) => [p.gig_id, p.predicted_profit])),
    settledMap:         new Map(settledStatuses.map((s) => [s.gig_id, s.is_settled])),
  };
}
