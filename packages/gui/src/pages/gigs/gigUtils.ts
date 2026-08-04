import { calcConfirmedProfit } from "@get-down/shared";

/**
 * Confirmed profit in pennies: billing total minus all fee allocation amounts.
 * Single implementation lives in @get-down/shared, shared between the API and
 * the GUI. See services/ACCOUNTING.md (API package) for the full definition.
 */
export { calcConfirmedProfit as confirmedProfit };

