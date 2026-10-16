import { isValidDateParts } from "./date.js";

/**
 * UK tax year utilities. The tax year runs from 6 April to 5 April inclusive.
 * Ordinary keys retain the "YYYY/YY" format; expanded years use full years
 * on both sides, such as "275760/275761".
 */

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function parseDateParts(value: string): DateParts | null {
  const match = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isSafeInteger(year) || !isValidDateParts(year, month, day)) return null;
  return { year, month, day };
}

/** Return the tax year start year containing the given date-only string. */
export function taxYearStartYear(isoDate: string): number {
  const date = parseDateParts(isoDate);
  if (!date) return Number.NaN;
  return date.month > 4 || (date.month === 4 && date.day >= 6) ? date.year : date.year - 1;
}

/** Format a tax year as "YYYY/YY" or, for expanded years, "YYYY/YYYY+1". */
export function formatTaxYearKey(startYear: number): string {
  const endYear = startYear + 1;
  if (startYear < 10000) return `${startYear}/${String(endYear).slice(-2)}`;
  return `${startYear}/${endYear}`;
}

/** Parse ordinary and expanded tax year keys back to the full start year. */
export function parseTaxYearKey(key: string): number {
  const match = /^(\d{1,})\/(\d{2}|\d{1,})$/.exec(key);
  if (!match) return Number.NaN;
  const startYear = Number(match[1]);
  const endPart = match[2];
  if (!Number.isSafeInteger(startYear)) return Number.NaN;
  if (match[1].length >= 5) {
    return Number(endPart) === startYear + 1 ? startYear : Number.NaN;
  }
  return Number(endPart) === (startYear + 1) % 100 ? startYear : Number.NaN;
}

export function isInCalendarYear(isoDate: string | null | undefined, year: string): boolean {
  if (!isoDate) return false;
  const date = parseDateParts(isoDate);
  return !!date && String(date.year) === year;
}

export function isInTaxYear(isoDate: string | null | undefined, taxYearKey: string): boolean {
  if (!isoDate) return false;
  const startYear = parseTaxYearKey(taxYearKey);
  if (!Number.isSafeInteger(startYear)) return false;
  return taxYearStartYear(isoDate) === startYear;
}

export function calendarYearsFromDates(dates: (string | null | undefined)[]): string[] {
  const years = new Set<string>();
  for (const date of dates) {
    const parts = date ? parseDateParts(date) : null;
    if (parts) years.add(String(parts.year));
  }
  return [...years].sort(compareYearsDescending);
}

export function taxYearsFromDates(dates: (string | null | undefined)[]): string[] {
  const years = new Set<number>();
  for (const date of dates) {
    const startYear = date ? taxYearStartYear(date) : Number.NaN;
    if (Number.isSafeInteger(startYear)) years.add(startYear);
  }
  return [...years].sort((a, b) => b - a).map(formatTaxYearKey);
}

export function calendarYearDateRange(year: string): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function taxYearDateRange(taxYearKey: string): { start: string; end: string } {
  const startYear = parseTaxYearKey(taxYearKey);
  return {
    start: `${startYear}-04-06`,
    end: `${startYear + 1}-04-05`,
  };
}

function compareYearsDescending(a: string, b: string): number {
  return Number(b) - Number(a);
}
