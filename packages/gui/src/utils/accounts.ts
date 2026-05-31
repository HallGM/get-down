/** Returns a human-readable label and colour for a CA balance.
 * positive = partner has taken more than entitled (overdrawn)
 * negative = partnership owes the partner (in credit)
 * zero     = perfectly balanced
 */
export function caLabel(balance: number): { text: string; color: string } {
  if (balance > 0) return { text: "Overdrawn", color: "var(--pico-del-color)" };
  if (balance < 0) return { text: "Owed", color: "var(--pico-ins-color, green)" };
  return { text: "Balanced", color: "var(--pico-muted-color)" };
}

/** Returns the appropriate balance label for any account.
 * Business accounts always show "Net balance" with a neutral colour.
 * Partner accounts use the standard overdrawn/owed/balanced labels.
 */
export function accountBalanceLabel(account: {
  isBusiness: boolean;
  caBalance: number;
}): { text: string; color: string } {
  return account.isBusiness
    ? { text: "Net balance", color: "var(--pico-muted-color)" }
    : caLabel(account.caBalance);
}
