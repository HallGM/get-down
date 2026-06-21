import { useMemo } from "react";
import { useAccountingSummary } from "../../api/hooks/useAccounting.js";
import { useYearFilter } from "../../hooks/useYearFilter.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import YearSelect from "../../components/YearSelect.js";
import { formatTaxYearKey, parseTaxYearKey } from "../../utils/taxYear.js";
import type { AccountingSummary } from "@get-down/shared";

// ─── Year option generation ───────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const CALENDAR_YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) =>
  String(CURRENT_YEAR - 6 + i)
).reverse();
const TAX_YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) =>
  formatTaxYearKey(CURRENT_YEAR - 6 + i)
).reverse();

// ─── Table sub-components ─────────────────────────────────────────────────────

function Row({ label, value, hint, indent }: { label: string; value: React.ReactNode; hint?: string; indent?: boolean }) {
  return (
    <tr>
      <td style={{ paddingLeft: indent ? "1.5rem" : undefined, color: "var(--pico-color)" }}>
        {label}
        {hint && (
          <span
            title={hint}
            style={{ cursor: "help", color: "var(--pico-muted-color)", fontSize: "0.85em", marginLeft: "0.3em" }}
          >ⓘ</span>
        )}
      </td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{value}</td>
    </tr>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <tr>
      <th
        colSpan={2}
        style={{
          paddingTop: "1.25rem",
          paddingBottom: "0.25rem",
          color: "var(--pico-muted-color)",
          fontWeight: 600,
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          borderBottom: "1px solid var(--pico-muted-border-color)",
        }}
      >
        {title}
      </th>
    </tr>
  );
}

function Divider() {
  return (
    <tr>
      <td colSpan={2} style={{ padding: 0, borderBottom: "1px solid var(--pico-muted-border-color)" }} />
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AccountingPage() {
  const { calendarYear, taxYear, setCalendarYear, setTaxYear } = useYearFilter();

  const params = useMemo(() => {
    if (calendarYear) return { year: Number(calendarYear) };
    if (taxYear) return { taxYearStart: parseTaxYearKey(taxYear) };
    return {};
  }, [calendarYear, taxYear]);

  const { data, isLoading, error } = useAccountingSummary(params);

  const periodLabel = calendarYear
    ? calendarYear
    : taxYear
    ? `Tax year ${taxYear}`
    : "All time";

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error)     return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Accounting</h1>
        <small style={{ color: "var(--pico-muted-color)" }}>{periodLabel}</small>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <YearSelect
          label="Year:"
          value={calendarYear ?? ""}
          options={CALENDAR_YEAR_OPTIONS}
          onChange={setCalendarYear}
        />
        <YearSelect
          label="Tax year:"
          value={taxYear ?? ""}
          options={TAX_YEAR_OPTIONS}
          onChange={setTaxYear}
        />
      </div>

      {data && <SummaryTable data={data} />}
    </main>
  );
}

// ─── Summary table ────────────────────────────────────────────────────────────

function SummaryTable({ data }: { data: AccountingSummary }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ maxWidth: "600px" }}>
        <colgroup>
          <col />
          <col style={{ width: "140px" }} />
        </colgroup>
        <tbody>

          {/* ── Gig activity ── */}
          <SectionHeader title="Gig activity" />
          <Row label="Gigs booked"    value={<strong>{data.gigsBooked}</strong>} />
          <Row label="Gigs performed" value={<strong>{data.gigsPerformed}</strong>} />

          {/* ── Turnover ── */}
          <SectionHeader title="Turnover" />
          <Row
            label="Settled gigs"
            hint="Net received from fully settled gigs in the period"
            value={<MoneyDisplay pennies={data.settledNetReceived} colorNegative bold />}
          />
          <Row
            label="Unsettled gigs (predicted)"
            hint="Predicted billing (discounted service price) for non-cancelled unsettled gigs"
            value={<MoneyDisplay pennies={data.predictedBillingUnsettled} colorNegative bold />}
          />
          <Divider />
          <Row
            label="Combined total"
            hint="Settled net received plus predicted billing for unsettled gigs"
            value={<MoneyDisplay pennies={data.settledNetReceived + data.predictedBillingUnsettled} colorNegative bold />}
          />

          {/* ── Expenses ── */}
          <SectionHeader title="Expenses" />
          <Row
            label="Fee allocations (settled gigs)"
            hint="Expense amounts linked to fee allocations on settled gigs."
            value={<MoneyDisplay pennies={data.expensesBreakdown.feeAllocation} colorNegative bold />}
            indent
          />
          <Row
            label="Showcases"
            hint="Expense amounts linked to showcases, either via a showcase fee allocation or directly."
            value={<MoneyDisplay pennies={data.expensesBreakdown.showcase} colorNegative bold />}
            indent
          />
          <Row
            label="Other"
            hint="Expenses with no fee allocation or showcase link"
            value={<MoneyDisplay pennies={data.expensesBreakdown.other} colorNegative bold />}
            indent
          />
          <Divider />
          <Row
            label="Total (settled)"
            hint="Settled expenses: fee allocations plus showcase plus other"
            value={<MoneyDisplay pennies={data.expenses} colorNegative bold />}
          />
          <Row
            label="Fee allocations (predicted unsettled)"
            hint="Role fees from service configuration for non-cancelled unsettled gigs"
            value={<MoneyDisplay pennies={data.predictedFeeAllocations} colorNegative bold />}
            indent
          />
          <Divider />
          <Row
            label="Combined total"
            hint="Settled expenses plus predicted fee allocations for unsettled gigs"
            value={<MoneyDisplay pennies={data.expenses + data.predictedFeeAllocations} colorNegative bold />}
          />

          {/* ── Business profit ── */}
          <SectionHeader title="Business profit" />
          <Row
            label="Business profit"
            hint="Net received from settled gigs minus settled expenses"
            value={<MoneyDisplay pennies={data.businessProfit} colorNegative bold />}
          />

          {/* ── Partner fee allocations ── */}
          <SectionHeader title="Partner fee allocations" />
          {data.feeAllocationsBreakdown.length === 0 ? (
            <Row label="No fee allocations recorded" value={<MoneyDisplay pennies={0} bold />} />
          ) : (
            <>
              {data.feeAllocationsBreakdown.map((a) => (
                <Row
                  key={a.personId}
                  label={a.personName}
                  hint="Fee allocations for settled gigs only"
                  value={<MoneyDisplay pennies={a.amount} colorNegative bold />}
                  indent
                />
              ))}
              <Divider />
              <Row
                label="Total fee allocations"
                hint="Total partner fee allocations for settled gigs only"
                value={<MoneyDisplay pennies={data.feeAllocationsTotal} colorNegative bold />}
              />
            </>
          )}

          {/* ── Shared profit ── */}
          <SectionHeader title="Shared profit" />
          <Row
            label="Confirmed shared profit"
            hint="Business profit minus settled partner fee allocations"
            value={<MoneyDisplay pennies={data.confirmedSharedProfit} colorNegative bold />}
          />
          <Row
            label="Predicted shared profit"
            hint={
              data.predictedProfitExcludedCount > 0
                ? `${data.predictedProfitExcludedCount} gig(s) excluded due to missing prices or fees`
                : "Predicted profit for non-cancelled unsettled gigs, excluding those with unavailable predictions"
            }
            value={<MoneyDisplay pennies={data.predictedSharedProfit} colorNegative bold />}
          />
          <Divider />
          <Row
            label="Combined total"
            hint="Confirmed shared profit plus predicted shared profit"
            value={<MoneyDisplay pennies={data.confirmedSharedProfit + data.predictedSharedProfit} colorNegative bold />}
          />

        </tbody>
      </table>
    </div>
  );
}
