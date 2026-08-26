import { useState } from "react";
import type { VatPeriodMode, VatReport } from "@get-down/shared";
import { useVatReport } from "../../api/hooks/useVat.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import EmptyState from "../../components/EmptyState.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import { formatDate, toInputDate } from "../../utils/date.js";

export default function VatPage() {
  const [mode, setMode] = useState<VatPeriodMode>("before");
  const initialDate = toInputDate(new Date());
  const [date, setDate] = useState(initialDate);
  const [draftDate, setDraftDate] = useState(initialDate);
  const { data, isLoading, error } = useVatReport(mode, date);

  return (
    <main className="container">
      <h1>VAT turnover</h1>
      <p>Review total turnover received in an inclusive rolling 12-month period. Gig dates are not used.</p>
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "end", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <label>
          {mode === "before" ? "Period end" : "Period start"}
          <input
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            onBlur={() => setDate(draftDate)}
          />
        </label>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: "inherit", marginBottom: "0.5rem" }}>Period based on</legend>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ marginBottom: 0 }}>
              <input
                type="radio"
                name="vat-period-mode"
                value="before"
                checked={mode === "before"}
                onChange={() => setMode("before")}
              />
              End date
            </label>
            <label style={{ marginBottom: 0 }}>
              <input
                type="radio"
                name="vat-period-mode"
                value="after"
                checked={mode === "after"}
                onChange={() => setMode("after")}
              />
              Start date
            </label>
          </div>
        </fieldset>
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
