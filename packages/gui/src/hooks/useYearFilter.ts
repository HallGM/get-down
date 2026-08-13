import { useState, useMemo } from "react";
import { calendarYearsFromDates, taxYearsFromDates, isInCalendarYear, isInTaxYear, calendarYearDateRange, taxYearDateRange } from "../utils/taxYear.js";

/**
 * Manages date range filter state with optional named-period sync.
 * 
 * `start` and `end` are the actual bounds sent to the API (ISO date strings).
 * `calendarYearLabel` and `taxYearLabel` track which named period (if any) was
 * last selected, purely to keep the dropdowns visually in sync. When the user
 * edits the dates directly (via setDateRange), these labels are cleared.
 *
 * Use this form when year options are static or managed externally
 * (e.g. AccountingPage, which sends the selected range as an API parameter).
 */
export function useYearFilter(initialCalendarYear: string | null = null) {
  const [calendarYearLabel, setCalendarYearLabelRaw] = useState<string | null>(initialCalendarYear);
  const [taxYearLabel, setTaxYearLabelRaw]           = useState<string | null>(null);
  
  // start/end are the actual bounds; computed from whichever named period is selected
  // Compute the initial date range once to avoid duplicate function calls
  const initialRange = initialCalendarYear ? calendarYearDateRange(initialCalendarYear) : null;
  
  const [start, setStart] = useState<string | null>(initialRange?.start ?? null);
  const [end, setEnd] = useState<string | null>(initialRange?.end ?? null);

  return {
    start,
    end,
    calendarYearLabel,
    taxYearLabel,
    setCalendarYear: (val: string | null) => {
      setCalendarYearLabelRaw(val);
      setTaxYearLabelRaw(null);
      if (val) {
        const { start: s, end: e } = calendarYearDateRange(val);
        setStart(s);
        setEnd(e);
      } else {
        setStart(null);
        setEnd(null);
      }
    },
    setTaxYear: (val: string | null) => {
      setTaxYearLabelRaw(val);
      setCalendarYearLabelRaw(null);
      if (val) {
        const { start: s, end: e } = taxYearDateRange(val);
        setStart(s);
        setEnd(e);
      } else {
        setStart(null);
        setEnd(null);
      }
    },
    setDateRange: (s: string | null, e: string | null) => {
      // User edited the dates directly, so clear the named period labels
      setCalendarYearLabelRaw(null);
      setTaxYearLabelRaw(null);
      setStart(s);
      setEnd(e);
    },
  };
}

/**
 * Year filter with data-aware filtering.
 * Derives year options from `items` and returns the filtered list.
 *
 * Use this form when you have a local array to filter client-side.
 * Pass `initialCalendarYear` to pre-select a year on mount.
 * 
 * Note: Returns calendarYear and taxYear as the label fields for backward compatibility.
 */
export function useYearFilterData<T>(
  items: T[] | null | undefined,
  getDate: (item: T) => string | null | undefined,
  initialCalendarYear: string | null = null,
) {
  const { calendarYearLabel, taxYearLabel, setCalendarYear, setTaxYear } = useYearFilter(initialCalendarYear);

  const allDates            = useMemo(() => (items ?? []).map(getDate), [items, getDate]);
  const calendarYearOptions = useMemo(() => calendarYearsFromDates(allDates), [allDates]);
  const taxYearOptions      = useMemo(() => taxYearsFromDates(allDates), [allDates]);

  const filtered = useMemo<T[]>(() => {
    const safe = items ?? [];
    if (calendarYearLabel) return safe.filter((i) => isInCalendarYear(getDate(i), calendarYearLabel));
    if (taxYearLabel)      return safe.filter((i) => isInTaxYear(getDate(i), taxYearLabel));
    return safe;
  }, [items, getDate, calendarYearLabel, taxYearLabel]);

  return { 
    calendarYear: calendarYearLabel, 
    taxYear: taxYearLabel, 
    setCalendarYear, 
    setTaxYear, 
    calendarYearOptions, 
    taxYearOptions, 
    filtered 
  };
}
