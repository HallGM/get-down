/**
 * Default subtype applied when a refund is created without an explicit subtype.
 * Single source of truth — import this everywhere instead of hard-coding 'adjustment'.
 */
export const REFUND_SUBTYPE_DEFAULT = 'adjustment' as const;

/**
 * Derives all billing figures from raw totals.
 * Single source of truth shared between the API service and the GUI.
 *
 * - `billingTotal`    = line-item subtotal, minus discount, plus travel, minus credits,
 *                         plus totalAdditionalCharges
 * - `netReceived`     = total paid minus all refunds (both credits and adjustments)
 * - `balanceAmount`   = max(0, billingTotal - netReceived)
 * - `depositRequired` = 20% of service-only subtotal (additional charges are excluded
 *                         from the deposit calculation)
 * - `depositPaid`     = min(netReceived, depositRequired)
 */
export function calcBillingTotals(opts: {
  subtotal: number;
  discountPercent: number;
  travelCost: number;
  totalCredits: number;
  totalPaid: number;
  totalRefunded: number;
  totalAdditionalCharges?: number;
}) {
  const discountAmount  = Math.round(opts.subtotal * opts.discountPercent / 100);
  const serviceTotal    = opts.subtotal - discountAmount + opts.travelCost - opts.totalCredits;
  const billingTotal    = serviceTotal + (opts.totalAdditionalCharges ?? 0);
  const netReceived     = opts.totalPaid - opts.totalRefunded;
  const depositRequired = Math.round(serviceTotal * 0.20);
  return {
    discountAmount,
    billingTotal,
    netReceived,
    depositRequired,
    depositPaid:   Math.min(netReceived, depositRequired),
    balanceAmount: Math.max(0, billingTotal - netReceived),
  };
}
