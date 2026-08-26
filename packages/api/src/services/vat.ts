import { z } from "zod";
import type { VatReport } from "@get-down/shared";
import * as repo from "../repository/vat.js";
import { BadRequestError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";
import { toDateString } from "../utils/date.js";

const RequestSchema = z.object({
  mode: z.enum(["before", "after"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

export async function getReport(input: unknown): Promise<VatReport> {
  const parsed = parseOrBadRequest(RequestSchema, input);
  const selected = parseDate(parsed.date);
  const periodStart = parsed.mode === "before" ? addDays(addMonths(selected, -12), 1) : selected;
  const periodEnd = parsed.mode === "before" ? selected : addDays(addMonths(selected, 12), -1);
  const bounds = parsed.mode === "before"
    ? { start: toDateString(periodStart)!, end: parsed.date }
    : { start: parsed.date, end: toDateString(periodEnd)! };
  const [rows, undated] = await Promise.all([repo.readTransactions(bounds.start, bounds.end), repo.readUndatedCounts()]);
  let runningTotal = 0;
  const transactions = rows.map((row) => {
    const effect = row.type === "payment" ? row.amount : -row.amount;
    runningTotal += effect;
    return {
      id: row.id,
      type: row.type,
      date: toDateString(row.date)!,
      amount: row.amount,
      effect,
      clientFirstName: row.client_first_name,
      clientLastName: row.client_last_name,
      ...(row.refund_subtype ? { refundSubtype: row.refund_subtype as "credit" | "adjustment" } : {}),
      runningTotal,
    };
  });
  return {
    mode: parsed.mode,
    selectedDate: parsed.date,
    periodStart: bounds.start,
    periodEnd: bounds.end,
    turnover: runningTotal,
    undatedPayments: undated.payments,
    undatedRefunds: undated.refunds,
    transactions,
  };
}

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || toDateString(date) !== value) throw new BadRequestError("date is not a valid calendar date");
  return date;
}
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInTargetMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInTargetMonth));
  return d;
}
function addDays(date: Date, days: number): Date { const d = new Date(date); d.setUTCDate(d.getUTCDate() + days); return d; }
