/**
 * Format an ISO date string (YYYY-MM-DD) or Date object for display.
 * e.g. "2025-06-14" → "14 Jun 2025"
 */
export function formatDate(value: string | Date | undefined | null): string {
  if (!value) return "—";
  if (typeof value === "string") {
    const calendarDate = toCalendarDateString(value);
    if (!calendarDate) return value;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(calendarDate)!;
    const d = new Date(0);
    d.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    d.setHours(0, 0, 0, 0);
    if (isNaN(d.getTime())) return value;
    try {
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return value;
    }
  }
  if (isNaN(value.getTime())) return String(value);
  try {
    return value.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(value);
  }
}

/**
 * Return the YYYY-MM-DD string for use in <input type="date" />.
 */
export function toInputDate(value: string | Date | undefined | null): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  const d = value;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** True when a stored date can be represented by the ordinary date input. */
export function isSupportedDateInputValue(value: string | undefined | null): boolean {
  if (!value) return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return !!match && isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** Return the event's calendar date from a date-only value or ISO timestamp. */
export function toCalendarDateString(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const timestamp = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/i.exec(value);
  const datePart = dateOnly ? value : timestamp?.[1];
  if (!datePart) return undefined;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)!;
  if (!isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]))) return undefined;
  if (timestamp && Number.isNaN(new Date(value).getTime())) return undefined;
  return datePart;
}

export function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day <= daysInMonth;
}
