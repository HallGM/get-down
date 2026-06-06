import { useState } from "react";

/**
 * Manages mutually exclusive calendar-year / tax-year filter state.
 * Selecting one automatically clears the other.
 */
export function useYearFilter() {
  const [calendarYear, setCalendarYearRaw] = useState<string | null>(null);
  const [taxYear, setTaxYearRaw]           = useState<string | null>(null);

  return {
    calendarYear,
    taxYear,
    setCalendarYear: (val: string | null) => { setCalendarYearRaw(val); setTaxYearRaw(null); },
    setTaxYear:      (val: string | null) => { setTaxYearRaw(val); setCalendarYearRaw(null); },
  };
}
