import { useState } from "react";
import type { VatReport } from "@get-down/shared";
import { useVatReport } from "../../api/hooks/useVat.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import EmptyState from "../../components/EmptyState.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import { formatDate, toInputDate } from "../../utils/date.js";
import { formatPenniesWhole } from "../../utils/money.js";

export default function VatPage() {
  const initialDate = toInputDate(new Date());
  const [date, setDate] = useState(initialDate);
  const [draftDate, setDraftDate] = useState(initialDate);
  const { data, isLoading, error } = useVatReport(date);

  return (
    <main className="container">
      <h1>VAT turnover</h1>
      <p>Review total turnover received in an inclusive rolling 12-month period. Gig dates are not used.</p>
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "end", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <label>
          Period end
          <input
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            onBlur={() => setDate(draftDate)}
          />
        </label>
      </div>
      {isLoading && <LoadingState />}
      {error && <ErrorBanner error={error} />}
      {data && <Report report={data} />}
    </main>
  );
}

function Report({ report }: { report: VatReport }) {
  return (
    <>
      <article>
        <header>Period: {formatDate(report.periodStart)} to {formatDate(report.periodEnd)}</header>
        <h2 style={{ marginBottom: 0 }}><MoneyDisplay pennies={report.turnover} bold /></h2>
        <small>Turnover after credit and adjustment refunds</small>
      </article>
      <VatGraph points={report.graph} />
      {(report.undatedPayments > 0 || report.undatedRefunds > 0) && (
        <aside style={{ marginBottom: "1rem" }}>
          Excluded because they have no date: {report.undatedPayments} payment{report.undatedPayments === 1 ? "" : "s"} and {report.undatedRefunds} refund{report.undatedRefunds === 1 ? "" : "s"}.
        </aside>
      )}
      {report.transactions.length === 0 ? <EmptyState message="No dated payments or applicable refunds fall within this period." /> : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>Date</th><th>Client</th><th>Type</th><th style={{ textAlign: "right" }}>Amount</th><th style={{ textAlign: "right" }}>Running turnover</th></tr></thead>
            <tbody>{report.transactions.map((transaction) => (
              <tr key={`${transaction.type}-${transaction.id}`}>
                <td>{formatDate(transaction.date)}</td>
                <td>{transaction.clientFirstName} {transaction.clientLastName}</td>
                <td>{transaction.type === "payment" ? "Payment" : `${transaction.refundSubtype} refund`}</td>
                <td style={{ textAlign: "right" }}><MoneyDisplay pennies={transaction.effect} colorNegative /></td>
                <td style={{ textAlign: "right" }}><MoneyDisplay pennies={transaction.runningTotal} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function VatGraph({ points }: { points: VatReport["graph"] }) {
  if (points.length === 0) return null;
  const width = 900;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 35, left: 70 };
  const vatThreshold = 9_000_000;
  const dataMax = points.reduce((value, point) => Math.max(value, point.turnover), 0);
  const min = points.reduce((value, point) => Math.min(value, point.turnover), 0);
  const tickSize = 2_000_000;
  const max = Math.max(Math.ceil(dataMax / tickSize) * tickSize, vatThreshold);
  const range = max - min || 1;
  const x = (index: number) => padding.left + (index / Math.max(points.length - 1, 1)) * (width - padding.left - padding.right);
  const y = (value: number) => padding.top + (1 - (value - min) / range) * (height - padding.top - padding.bottom);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.turnover)}`).join(" ");
  const yTicks = Array.from({ length: Math.floor((max - min) / tickSize) + 1 }, (_, index) => min + index * tickSize);
  const xTickIndexes = Array.from({ length: 6 }, (_, index) => Math.round(index * (points.length - 1) / 5));
  return (
    <article>
      <header>Rolling 12-month turnover</header>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Rolling 12-month turnover graph">
          {yTicks.map((value) => (
            <g key={value}>
              <line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} stroke="var(--pico-muted-border-color)" strokeDasharray="3 3" />
              <text x={padding.left - 8} y={y(value) + 4} textAnchor="end" fontSize="11" fill="currentColor">{formatPenniesWhole(value)}</text>
            </g>
          ))}
          <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="currentColor" />
          <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="currentColor" />
          {xTickIndexes.map((index) => (
            <g key={points[index]?.date}>
              <line x1={x(index)} x2={x(index)} y1={height - padding.bottom} y2={height - padding.bottom + 5} stroke="currentColor" />
              <text x={x(index)} y={height - padding.bottom + 19} textAnchor="middle" fontSize="11" fill="currentColor">{formatDate(points[index]!.date)}</text>
            </g>
          ))}
          <line x1={padding.left} x2={width - padding.right} y1={y(vatThreshold)} y2={y(vatThreshold)} stroke="var(--pico-del-color)" strokeWidth="2" strokeDasharray="6 4" />
          <text x={width - padding.right - 4} y={y(vatThreshold) - 6} textAnchor="end" fontSize="11" fill="var(--pico-del-color)">{`VAT limit ${formatPenniesWhole(vatThreshold)}`}</text>
          <path d={path} fill="none" stroke="var(--pico-primary)" strokeWidth="2" />
          {points.map((point, index) => (
            <circle key={point.date} cx={x(index)} cy={y(point.turnover)} r="2" fill="var(--pico-primary)">
              <title>{`${formatDate(point.date)}: £${(point.turnover / 100).toFixed(2)}`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </article>
  );
}
