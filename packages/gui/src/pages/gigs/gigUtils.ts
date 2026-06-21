import type { Gig } from "@get-down/shared";

/** Confirmed profit in pennies: billing total minus all fee allocation amounts. */
export function confirmedProfit(g: Pick<Gig, "billingTotal" | "feesTotal">): number {
  return (g.billingTotal ?? 0) - (g.feesTotal ?? 0);
}
