/**
 * Default subtype applied when a refund is created without an explicit subtype.
 * Single source of truth — import this everywhere instead of hard-coding 'adjustment'.
 */
export const REFUND_SUBTYPE_DEFAULT = 'adjustment' as const;

export type RefundSubtype = 'credit' | 'adjustment' | 'write_off';

/**
 * Subtypes that reduce the billing total (a price reduction, whether cash moves or not):
 * 'credit' (cash goodwill gesture) and 'write_off' (debt forgiveness, no cash movement).
 */
export const CREDIT_SUBTYPES: readonly RefundSubtype[] = ['credit', 'write_off'];

/**
 * Subtypes that reduce net received (cash actually returned to the client):
 * 'credit' (cash goodwill gesture) and 'adjustment' (overpayment refund).
 * Explicitly excludes 'write_off', since no cash moves for a write-off.
 */
export const REFUND_SUBTYPES: readonly RefundSubtype[] = ['credit', 'adjustment'];

/** True when a refund subtype reduces the billing total (see `CREDIT_SUBTYPES`). */
export function isCreditSubtype(subtype: string): boolean {
  return (CREDIT_SUBTYPES as readonly string[]).includes(subtype);
}

/** True when a refund subtype reduces net received (see `REFUND_SUBTYPES`). */
export function isRefundSubtype(subtype: string): boolean {
  return (REFUND_SUBTYPES as readonly string[]).includes(subtype);
}

/**
 * Derives all billing figures from raw totals.
 * Single source of truth shared between the API service and the GUI.
 *
 * Note: `subtotal` is expected to already reflect any item-level discounts.
 * Overall discount and item-level discounts are mutually exclusive (enforced at the API layer),
 * so the `discountPercent` field here is only non-zero when no item discounts are in use.
 *
 * - `billingTotal`    = line-item subtotal, minus discount, plus travel,
 *                         minus totalCredits (sum of 'credit' + 'write_off' refunds),
 *                         plus totalAdditionalCharges
 * - `netReceived`     = total paid minus totalRefunded (sum of 'credit' + 'adjustment' refunds,
 *                         explicitly excluding 'write_off' refunds which only affect billing total)
 * - `balanceAmount`   = max(0, billingTotal - netReceived)
 * - `depositRequired` = 20% of service-only subtotal (card charges are excluded
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
  totalCardCharges?: number;
}) {
  const discountAmount  = Math.round(opts.subtotal * opts.discountPercent / 100);
  const serviceTotal    = opts.subtotal - discountAmount + opts.travelCost - opts.totalCredits;
  const billingTotal    = serviceTotal + (opts.totalCardCharges ?? 0);
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

/**
 * Applies an item-level discount percentage to an amount (in pennies).
 * Returns the discounted amount (in pennies), rounded correctly.
 */
export function applyItemDiscount(amount: number, discountPercent: number): number {
  if (discountPercent <= 0) return amount;
  if (discountPercent >= 100) return 0;
  return Math.round(amount * (1 - discountPercent / 100));
}

/**
 * Computes the total of line items after applying each item's individual discount (if any).
 * Used wherever a line items subtotal is needed when item-level discounts may be present.
 */
export function effectiveLineItemsSubtotal(
  items: { amount?: number | null; discountPercent?: number | null }[]
): number {
  return items.reduce((sum, item) => {
    const amount = item.amount ?? 0;
    const discount = item.discountPercent ?? 0;
    return sum + applyItemDiscount(amount, discount);
  }, 0);
}
