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
 * Return the signed effect of a payment or refund on net received.
 * Amounts are stored as positive pennies; refunds reduce the total.
 */
export function calcTransactionEffect(type: "payment" | "refund", amount: number): number {
  return type === "payment" ? amount : -amount;
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

/**
 * Per-gig confirmed profit, in pennies: billing total minus every fee
 * allocation amount for that gig (partner AND contractor allocations alike).
 *
 * Single source of truth for this figure — used by both the API and the GUI
 * gigs list/detail pages. See services/ACCOUNTING.md → "Confirmed profit
 * (per-gig)" for the full definition and why partner allocations are
 * deliberately included here (unlike the whole-business "business profit"
 * figure on the Accounting page, which excludes them).
 */
export function calcConfirmedProfit(gig: { billingTotal?: number | null; feesTotal?: number | null }): number {
  return (gig.billingTotal ?? 0) - (gig.feesTotal ?? 0);
}

/**
 * Derives invoice totals (subtotal, discount, service total, total, amount due).
 * Single source of truth shared between the API (`invoices.ts`, at invoice-creation
 * time) and the GUI (`InvoiceEdit.tsx`, on every live recalculation while editing an
 * existing invoice). Previously these were two separate, hand-written implementations
 * that silently drifted apart. This function's doc-comment is the reference definition
 * for invoice arithmetic (a distinct concern from gig/business accounting, which is
 * covered by services/ACCOUNTING.md in the API package).
 *
 * The two bugs this fixes by centralising the formula:
 *   1. The GUI's old recalculation summed raw line-item amounts, ignoring each item's
 *      own `discountPercent`. `effectiveLineItemsSubtotal` (below) applies it correctly,
 *      matching what the API has always done at invoice-creation time.
 *   2. The GUI's old recalculation always added card charges into `total`. A DEPOSIT
 *      invoice's stored `total` is deliberately service-only (subtotal minus discount,
 *      plus travel cost) — card charges are tracked and paid separately, never baked
 *      into the deposit total. Only a BALANCE invoice's `total` includes card charges.
 *      (Card charges still count towards `amountDue` for both invoice types — see below.)
 *
 * - `subtotal`     = sum of each line item's amount after its own `discountPercent`
 *                     is applied (see `effectiveLineItemsSubtotal`)
 * - `discountAmount` = subtotal * discountPercent (the invoice's overall discount;
 *                     mutually exclusive with item-level discounts in practice)
 * - `serviceTotal` = subtotal - discountAmount + travelCost (what the client owes for
 *                     the booking itself, before any card-processing charges)
 * - `total`        = serviceTotal + totalCardCharges for a BALANCE invoice;
 *                     serviceTotal alone (no card charges) for a DEPOSIT invoice
 * - `amountDue`    = for a DEPOSIT invoice: 20% of serviceTotal, plus totalCardCharges
 *                     linked to this invoice, minus totalPaid;
 *                     for a BALANCE invoice: total minus totalPaid
 *                     (both floored at 0 — an invoice is never "due" a negative amount)
 */
export function calcInvoiceTotals(opts: {
  lineItems: { amount?: number | null; discountPercent?: number | null }[];
  totalCardCharges: number;
  totalPaid: number;
  discountPercent: number;
  travelCost: number;
  invoiceType: 'deposit' | 'balance';
}) {
  const subtotal       = effectiveLineItemsSubtotal(opts.lineItems);
  const discountAmount = Math.round(subtotal * opts.discountPercent / 100);
  const serviceTotal   = subtotal - discountAmount + opts.travelCost;
  const total          = opts.invoiceType === 'balance' ? serviceTotal + opts.totalCardCharges : serviceTotal;
  const amountDue      = opts.invoiceType === 'deposit'
    ? Math.max(0, Math.round(serviceTotal * 0.20) + opts.totalCardCharges - opts.totalPaid)
    : Math.max(0, total - opts.totalPaid);
  return { subtotal, discountAmount, serviceTotal, total, amountDue };
}
