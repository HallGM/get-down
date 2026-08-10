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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
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
        {subtitle && (
          <div style={{ textTransform: "none", letterSpacing: "normal", fontWeight: 400, fontSize: "0.9em", marginTop: "0.15rem" }}>
            {subtitle}
          </div>
        )}
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
          <SectionHeader title="Turnover" subtitle="What clients pay, in total" />
          <Row
            label="Settled gigs (actual)"
            hint="Actual cash received (net of refunds) from fully settled gigs in the period"
            value={<MoneyDisplay pennies={data.settledNetReceived} colorNegative bold />}
          />
          <Row
            label="Unsettled gigs (predicted)"
            hint="Forecast only: predicted amount clients will pay (line items, travel and card charges) for non-cancelled gigs not yet settled"
            value={<MoneyDisplay pennies={data.predictedBillingUnsettled} colorNegative bold />}
          />
          <Divider />
          <Row
            label="Combined total"
            hint="Actual settled turnover plus forecast turnover for unsettled gigs"
            value={<MoneyDisplay pennies={data.settledNetReceived + data.predictedBillingUnsettled} colorNegative bold />}
          />

          {/* ── Expenses ── */}
          <SectionHeader title="Expenses" subtitle="Contractor fees and other business costs — never includes partner fee allocations" />
          <Row
            label="Fee allocations (settled gigs)"
            hint="Actual: full amount of expenses linked to fee allocations on settled gigs (mostly contractor payments; partner allocations are never expenses)"
            value={<MoneyDisplay pennies={data.expensesBreakdown.feeAllocation} colorNegative bold />}
            indent
          />
          <Row
            label="Showcases"
            hint="Actual: full amount of expenses linked to showcases, either via a showcase fee allocation or directly"
            value={<MoneyDisplay pennies={data.expensesBreakdown.showcase} colorNegative bold />}
            indent
          />
          <Row
            label="Other"
            hint="Actual: expenses with no fee allocation or showcase link, including any linked only to unsettled-gig fee allocations"
            value={<MoneyDisplay pennies={data.expensesBreakdown.other} colorNegative bold />}
            indent
          />
          <Divider />
          <Row
            label="Total (settled)"
            hint="Actual settled expenses: fee allocations plus showcases plus other"
            value={<MoneyDisplay pennies={data.expenses} colorNegative bold />}
          />
          <Row
            label="Fee allocations (predicted unsettled)"
            hint="Forecast only: role fees from service configuration for non-cancelled unsettled gigs"
            value={<MoneyDisplay pennies={data.predictedFeeAllocations} colorNegative bold />}
            indent
          />
          <Divider />
          <Row
            label="Combined total"
            hint="Actual settled expenses plus forecast fee allocations for unsettled gigs"
            value={<MoneyDisplay pennies={data.expenses + data.predictedFeeAllocations} colorNegative bold />}
          />

          {/* ── Tax-only expenses (in Expenses section) ── */}
          <Row
            label="Tax-only expenses"
            hint="Personal costs claimed for tax purposes only — not included in the settled expenses or forecast totals above"
            value={<MoneyDisplay pennies={data.taxOnlyExpensesTotal} colorNegative bold />}
            indent
          />
          <Divider />
          <Row
            label="Total taxable expenses"
            hint="Actual settled expenses plus tax-only expenses — use this total for tax reporting purposes"
            value={<MoneyDisplay pennies={data.expenses + data.taxOnlyExpensesTotal} colorNegative bold />}
          />

          {/* ── Business profit ── */}
           <SectionHeader title="Business profit" subtitle="Whole-business result before any partner takes their playing fee" />
           <Row
             label="Business profit"
             hint="Actual settled turnover minus actual settled expenses. Excludes partner fee allocations — see 'Partner fee allocations' below, which is a distribution of this profit, not a cost."
             value={<MoneyDisplay pennies={data.businessProfit} colorNegative bold />}
           />

           {/* ── Tax-only expenses and taxable profit ── */}
           <SectionHeader title="Tax adjustments" subtitle="Personal costs for tax purposes, excluded from business profit" />
           <Row
             label="Tax-only expenses"
             hint="Personal costs claimed for tax purposes only — not recorded as payments and excluded from business profit"
             value={<MoneyDisplay pennies={data.taxOnlyExpensesTotal} colorNegative bold />}
           />
           <Divider />
           <Row
             label="Taxable profit"
             hint="Business profit adjusted for tax-only expenses — the figure to use on tax returns"
             value={<MoneyDisplay pennies={data.taxableProfit} colorNegative bold />}
           />

          {/* ── Partner fee allocations ── */}
          <SectionHeader
            title="Partner fee allocations"
            subtitle="A distribution of the business profit above to partners for gigs they played — not a business expense"
          />
          {data.feeAllocationsBreakdown.length === 0 ? (
            <Row label="No fee allocations recorded" value={<MoneyDisplay pennies={0} bold />} />
          ) : (
            <>
              {data.feeAllocationsBreakdown.map((a) => (
                <Row
                  key={a.personId}
                  label={a.personName}
                  hint="Actual: fee allocations for settled gigs only"
                  value={<MoneyDisplay pennies={a.amount} colorNegative bold />}
                  indent
                />
              ))}
              <Divider />
              <Row
                label="Total fee allocations"
                hint="Actual: total partner fee allocations for settled gigs only"
                value={<MoneyDisplay pennies={data.feeAllocationsTotal} colorNegative bold />}
              />
            </>
          )}

          {/* ── Shared profit ── */}
          <SectionHeader title="Shared profit" subtitle="What is left to split between partners after each has taken their playing fee" />
          <Row
            label="Confirmed shared profit"
            hint="Actual: business profit minus settled partner fee allocations"
            value={<MoneyDisplay pennies={data.confirmedSharedProfit} colorNegative bold />}
          />
          <Row
            label="Predicted shared profit"
            hint={
              data.predictedProfitExcludedCount > 0
                ? `Forecast only, excludes partner fees already: ${data.predictedProfitExcludedCount} gig(s) excluded due to missing prices or fees`
                : "Forecast only: predicted profit for non-cancelled unsettled gigs (already net of predicted partner and contractor fees), excluding gigs with unavailable predictions"
            }
            value={<MoneyDisplay pennies={data.predictedSharedProfit} colorNegative bold />}
          />
          <Divider />
          <Row
            label="Combined total"
            hint="Actual confirmed shared profit plus forecast predicted shared profit"
            value={<MoneyDisplay pennies={data.confirmedSharedProfit + data.predictedSharedProfit} colorNegative bold />}
          />

        </tbody>
      </table>
    </div>
  );
}
