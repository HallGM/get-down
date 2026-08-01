import type { Invoice } from "@get-down/shared";
import { useAllInvoices } from "../../api/hooks/useInvoices.js";
import { useSearch } from "../../hooks/useSearch.js";
import { useYearFilterData } from "../../hooks/useYearFilter.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import EmptyState from "../../components/EmptyState.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import DateCell from "../../components/DateCell.js";
import YearFilterBar from "../../components/YearFilterBar.js";
import SearchInput from "../../components/SearchInput.js";
import DataTable, { type Column } from "../../components/DataTable.js";

// ---------------------------------------------------------------------------
// Filter predicate (module-scope keeps the reference stable for useSearch)
// ---------------------------------------------------------------------------
function filterInvoice(inv: Invoice, q: string): boolean {
  return (
    inv.invoiceNumber.toLowerCase().includes(q) ||
    inv.customerName.toLowerCase().includes(q)
  );
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------
const COLUMNS: Column<Invoice>[] = [
  {
    key: "invoiceNumber",
    header: "Invoice no.",
    cellStyle: { whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" },
  },
  { key: "customerName", header: "Customer" },
  {
    key: "date",
    header: "Date",
    cellStyle: { whiteSpace: "nowrap" },
    render: (inv) => <DateCell date={inv.date} />,
  },
  {
    key: "invoiceType",
    header: "Type",
    cellStyle: { textTransform: "capitalize" },
  },
  {
    key: "totalAmount",
    header: "Total",
    headerStyle: { textAlign: "right" },
    cellStyle: { textAlign: "right", whiteSpace: "nowrap" },
    render: (inv) => <MoneyDisplay pennies={inv.totalAmount} />,
  },
  {
    key: "amountDue",
    header: "Amount due",
    headerStyle: { textAlign: "right" },
    cellStyle: { textAlign: "right", whiteSpace: "nowrap" },
    render: (inv) => <MoneyDisplay pennies={inv.amountDue} />,
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function InvoicesList() {
  const { data: invoices = [], isLoading, error } = useAllInvoices();

  const currentYear = String(new Date().getFullYear());

  const {
    calendarYear, taxYear, setCalendarYear, setTaxYear,
    calendarYearOptions, taxYearOptions,
    filtered,
  } = useYearFilterData(invoices, (inv) => inv.date, currentYear);

  const { search, setSearch, displayed } = useSearch(filtered, filterInvoice);

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error)     return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Invoices</h1>
      </div>

      <YearFilterBar
        calendarYear={calendarYear}
        taxYear={taxYear}
        calendarYearOptions={calendarYearOptions}
        taxYearOptions={taxYearOptions}
        setCalendarYear={setCalendarYear}
        setTaxYear={setTaxYear}
        count={displayed.length}
        noun="invoice"
      />

      <div style={{ marginBottom: "1rem" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by invoice number or customer..."
          ariaLabel="Search invoices"
        />
      </div>

      {displayed.length === 0 ? (
        <EmptyState message={search ? "No invoices match your search." : "No invoices found."} />
      ) : (
        <DataTable<Invoice>
          columns={COLUMNS}
          data={displayed}
          rowHref={(inv) => `/gigs/${inv.gigId}?tab=billing`}
          hideSearch
        />
      )}
    </main>
  );
}
