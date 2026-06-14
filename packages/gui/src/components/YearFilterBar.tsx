import YearSelect from "./YearSelect.js";
import CountBadge from "./CountBadge.js";

interface YearFilterBarProps {
  calendarYear: string | null;
  taxYear: string | null;
  calendarYearOptions: string[];
  taxYearOptions: string[];
  setCalendarYear: (v: string | null) => void;
  setTaxYear: (v: string | null) => void;
  count: number;
  noun: string;
}

export default function YearFilterBar({
  calendarYear,
  taxYear,
  calendarYearOptions,
  taxYearOptions,
  setCalendarYear,
  setTaxYear,
  count,
  noun,
}: YearFilterBarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
      <YearSelect
        label="Year:"
        value={calendarYear ?? ""}
        options={calendarYearOptions}
        onChange={setCalendarYear}
      />
      <YearSelect
        label="Tax year:"
        value={taxYear ?? ""}
        options={taxYearOptions}
        onChange={setTaxYear}
      />
      <CountBadge count={count} noun={noun} />
    </div>
  );
}
