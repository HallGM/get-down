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
          <><br /><small style={{ color: "var(--pico-muted-color)", fontWeight: 400 }}>{hint}</small></>
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

          {/* ── Income ── */}
          <SectionHeader title="Income" />
          <Row
            label="Pot income"
            hint="All payments received in period (by payment date), minus refunds"
            value={<MoneyDisplay pennies={data.potIncome} colorNegative bold />}
          />
          <Row
            label="Earned income"
            hint="Payments for completed gigs in period (by gig date), minus refunds"
            value={<MoneyDisplay pennies={data.earnedIncome} colorNegative bold />}
          />

          {/* ── Expenses ── */}
          <SectionHeader title="Expenses" />
          <Row
            label="Total expenses"
            hint="All expenses by invoice date"
            value={<MoneyDisplay pennies={data.expenses} colorNegative bold />}
          />

          {/* ── Profit before drawings ── */}
          <SectionHeader title="Profit before drawings" />
          <Row
            label="Pot profit"
            hint="Pot income minus expenses"
            value={<MoneyDisplay pennies={data.potProfit} colorNegative bold />}
          />
          <Row
            label="Taxable profit"
            hint="Earned income minus expenses"
            value={<MoneyDisplay pennies={data.taxableProfit} colorNegative bold />}
          />

          {/* ── Drawings ── */}
          <SectionHeader title="Drawings" />
          {data.drawingsBreakdown.length === 0 ? (
            <Row label="No drawings recorded" value={<MoneyDisplay pennies={0} bold />} />
          ) : (
            <>
              {data.drawingsBreakdown.map((d) => (
                <Row
                  key={d.personId}
                  label={d.personName}
                  value={<MoneyDisplay pennies={d.amount} colorNegative bold />}
                  indent
                />
              ))}
              <Divider />
              <Row label="Total drawings" value={<MoneyDisplay pennies={data.drawingsTotal} colorNegative bold />} />
            </>
          )}

          {/* ── Profit after drawings ── */}
          <SectionHeader title="Profit after drawings" />
          <Row
            label="Pot after drawings"
            hint="Pot profit minus total drawings"
            value={<MoneyDisplay pennies={data.potAfterDrawings} colorNegative bold />}
          />
          <Row
            label="Shared profit"
            hint="Taxable profit minus total drawings"
            value={<MoneyDisplay pennies={data.sharedProfit} colorNegative bold />}
          />

        </tbody>
      </table>
    </div>
  );
}
