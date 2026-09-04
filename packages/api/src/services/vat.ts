import { z } from "zod";
import { calcTransactionEffect } from "@get-down/shared";
import type { VatGraphPoint, VatReport } from "@get-down/shared";
import * as repo from "../repository/vat.js";
import { BadRequestError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";
import { toDateString } from "../utils/date.js";

const RequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

export async function getReport(input: unknown): Promise<VatReport> {
  const { date } = parseOrBadRequest(RequestSchema, input);
  const selected = parseDate(date);
  const periodStart = rollingWindowStart(selected);
  const graphDataStart = rollingWindowStart(periodStart);
  const [rows, undated] = await Promise.all([
    repo.readTransactions(toDateString(graphDataStart)!, date),
    repo.readUndatedCounts(),
  ]);
  const datedRows = rows.map((row) => ({ ...row, date: toDateString(row.date)! }));
  const periodStartString = toDateString(periodStart)!;
  const transactions = mapTransactions(datedRows.filter((row) => row.date >= periodStartString));
  return {
    selectedDate: date,
    periodStart: toDateString(periodStart)!,
    periodEnd: date,
    turnover: transactions.at(-1)?.runningTotal ?? 0,
    undatedPayments: undated.payments,
    undatedRefunds: undated.refunds,
    transactions,
    graph: buildGraph(periodStart, selected, datedRows),
  };
}

function mapTransactions(rows: repo.VatTransactionRow[]): VatReport["transactions"] {
  let runningTotal = 0;
  return rows.map((row) => {
    const effect = transactionEffect(row);
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
}

function buildGraph(
  graphStart: Date,
  selectedEnd: Date,
  transactions: Array<Omit<repo.VatTransactionRow, "date"> & { date: string }>,
): VatGraphPoint[] {
  const points: VatGraphPoint[] = [];
  for (let pointDate = new Date(graphStart); pointDate <= selectedEnd; pointDate = addDays(pointDate, 1)) {
    const windowStart = rollingWindowStart(pointDate);
    const pointDateString = toDateString(pointDate)!;
    const windowStartString = toDateString(windowStart)!;
    const turnover = transactions.reduce((total, row) => {
      if (row.date < windowStartString || row.date > pointDateString) return total;
      return total + transactionEffect(row);
    }, 0);
    points.push({ date: pointDateString, turnover });
  }
  return points;
}

function transactionEffect(row: repo.VatTransactionRow): number {
  return calcTransactionEffect(row.type, row.amount);
}

function rollingWindowStart(date: Date): Date {
  return addDays(addMonths(date, -12), 1);
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

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
