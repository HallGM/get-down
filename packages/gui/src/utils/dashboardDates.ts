import { isSupportedDateInputValue } from "./date.js";

/**
 * Returns true when an event date should remain visible on Main.
 * Missing dates stay visible; dated issues must be strictly older than the
 * two-calendar-month cutoff. Dates are compared as calendar-day strings.
 */
export function isOlderThanTwoCalendarMonths(
  eventDate: string | undefined,
  today: Date = new Date(),
): boolean {
  if (!eventDate) return true;
  if (!isSupportedDateInputValue(eventDate)) return false;

  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  const targetMonthDate = new Date(year, month - 2, 1);
  const targetYear = targetMonthDate.getFullYear();
  const targetMonth = targetMonthDate.getMonth();
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const cutoffDay = Math.min(day, lastDayOfTargetMonth);
  const cutoff = `${String(targetYear).padStart(4, "0")}-${String(targetMonth + 1).padStart(2, "0")}-${String(cutoffDay).padStart(2, "0")}`;

  return eventDate < cutoff;
}
