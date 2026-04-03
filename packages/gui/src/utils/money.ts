/**
 * Format an integer number of pence/cents as a currency string.
 * e.g. 12500 → "£125.00"
 */
export function formatPennies(pennies: number): string {
  return `£${(pennies / 100).toFixed(2)}`;
}

/**
 * Convert integer pennies to a pounds-and-pence number suitable for a form input.
 * e.g. 1250 → 12.5  (display as "12.50" via the input's step="0.01")
 *
 * Note: `formatPennies` also divides by 100 but returns a formatted "£X.XX" string
 * for display. This function returns a raw number for use as a controlled input value.
 */
export function penniesToPounds(pennies: number): number {
  return pennies / 100;
}

/**
 * Convert a pounds-and-pence number from a form input to integer pennies.
 * Uses Math.round to avoid floating point errors (e.g. 12.50 → 1250, 0.1 + 0.2 → 30).
 */
export function poundsToPennies(pounds: number): number {
  return Math.round(pounds * 100);
}

/**
 * Parse a "£X.XX" or "X.XX" string into integer pennies.
 */
export function parseToPennies(value: string): number {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Math.round(num * 100);
}
