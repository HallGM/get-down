/**
 * UK tax year utilities.
 *
 * The UK tax year runs from 6 April of one calendar year to 5 April of the
 * next (inclusive). For example, the "2024/25" tax year spans
 * 6 April 2024 to 5 April 2025.
 *
 * Tax year keys use the format "YYYY/YY" (e.g. "2024/25").
 */

/**
 * Parse an ISO date string (YYYY-MM-DD) as a local date, avoiding UTC
 * midnight boundary issues that arise from passing an ISO string directly
 * to `new Date()`.
 */
function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Return the tax year start year that contains the given local date.
 * e.g. 2024-04-06 → 2024, 2025-04-05 → 2024, 2025-04-06 → 2025.
 */
export function taxYearStartYear(isoDate: string): number {
  const d = parseLocalDate(isoDate);
  const year = d.getFullYear();
  const taxYearStart = new Date(year, 3, 6); // 6 April of this calendar year
  return d >= taxYearStart ? year : year - 1;
}

/**
 * Format a tax year start year as a "YYYY/YY" key, e.g. 2024 → "2024/25".
 */
export function formatTaxYearKey(startYear: number): string {
  const endYY = String(startYear + 1).slice(-2);
  return `${startYear}/${endYY}`;
}

/**
 * Parse a "YYYY/YY" key back to the start year, e.g. "2024/25" → 2024.
 */
export function parseTaxYearKey(key: string): number {
  return parseInt(key.slice(0, 4), 10);
}

/**
 * Return true if the expense date falls within the given tax year key.
 * Expenses with a null or empty date always return false.
 */
export function isInTaxYear(isoDate: string | null | undefined, taxYearKey: string): boolean {
  if (!isoDate) return false;
  const startYear = parseTaxYearKey(taxYearKey);
  const d = parseLocalDate(isoDate);
  const start = new Date(startYear, 3, 6);     // 6 Apr YYYY
  const end = new Date(startYear + 1, 3, 6);   // 6 Apr YYYY+1 (exclusive)
  return d >= start && d < end;
}

/**
 * Derive a sorted-descending list of unique calendar year strings (e.g. "2024")
 * present in the given list of ISO date strings.
 */
export function calendarYearsFromDates(dates: (string | null | undefined)[]): string[] {
  const years = new Set<string>();
  for (const d of dates) {
    if (d) years.add(d.slice(0, 4));
  }
  return [...years].sort().reverse();
}

/**
 * Derive a sorted-descending list of unique tax year keys (e.g. "2024/25")
 * present in the given list of ISO date strings.
 */
export function taxYearsFromDates(dates: (string | null | undefined)[]): string[] {
  const keys = new Set<string>();
  for (const d of dates) {
    if (d) keys.add(formatTaxYearKey(taxYearStartYear(d)));
  }
  return [...keys].sort().reverse();
}
