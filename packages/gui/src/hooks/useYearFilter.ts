import { useState, useMemo } from "react";
import { calendarYearsFromDates, taxYearsFromDates, isInCalendarYear, isInTaxYear } from "../utils/taxYear.js";

/**
 * Manages mutually exclusive calendar-year / tax-year filter state.
 * Selecting one automatically clears the other.
 *
 * Use this form when year options are static or managed externally
 * (e.g. AccountingPage, which sends the selected year as an API parameter).
 *
 * Pass `initialCalendarYear` to pre-select a calendar year on mount
 * (e.g. `String(new Date().getFullYear())` to default to the current year).
 */
export function useYearFilter(initialCalendarYear: string | null = null) {
  const [calendarYear, setCalendarYearRaw] = useState<string | null>(initialCalendarYear);
  const [taxYear, setTaxYearRaw]           = useState<string | null>(null);

  return {
    calendarYear,
    taxYear,
    setCalendarYear: (val: string | null) => { setCalendarYearRaw(val); setTaxYearRaw(null); },
    setTaxYear:      (val: string | null) => { setTaxYearRaw(val); setCalendarYearRaw(null); },
  };
}

/**
 * Year filter with data-aware filtering.
 * Derives year options from `items` and returns the filtered list.
 *
 * Use this form when you have a local array to filter client-side.
 * Pass `initialCalendarYear` to pre-select a year on mount.
 */
export function useYearFilterData<T>(
  items: T[] | null | undefined,
  getDate: (item: T) => string | null | undefined,
  initialCalendarYear: string | null = null,
) {
  const { calendarYear, taxYear, setCalendarYear, setTaxYear } = useYearFilter(initialCalendarYear);

  const allDates            = useMemo(() => (items ?? []).map(getDate), [items, getDate]);
  const calendarYearOptions = useMemo(() => calendarYearsFromDates(allDates), [allDates]);
  const taxYearOptions      = useMemo(() => taxYearsFromDates(allDates), [allDates]);

  const filtered = useMemo<T[]>(() => {
    const safe = items ?? [];
    if (calendarYear) return safe.filter((i) => isInCalendarYear(getDate(i), calendarYear));
    if (taxYear)      return safe.filter((i) => isInTaxYear(getDate(i), taxYear));
    return safe;
  }, [items, getDate, calendarYear, taxYear]);

  return { calendarYear, taxYear, setCalendarYear, setTaxYear, calendarYearOptions, taxYearOptions, filtered };
}
