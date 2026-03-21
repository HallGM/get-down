/**
 * Format an integer number of pence/cents as a currency string.
 * e.g. 12500 → "£125.00"
 */
export function formatPennies(pennies: number): string {
  return `£${(pennies / 100).toFixed(2)}`;
}

/**
 * Parse a "£X.XX" or "X.XX" string into integer pennies.
 */
export function parseToPennies(value: string): number {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Math.round(num * 100);
}
