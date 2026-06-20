import { useNavigate } from "react-router-dom";
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
// Page component
// ---------------------------------------------------------------------------
export default function InvoicesList() {
  const navigate = useNavigate();
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
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Invoice no.</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "right" }}>Amount due</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((inv) => (
                <tr
                  key={inv.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/gigs/${inv.gigId}?tab=billing`)}
                >
                  <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    {inv.invoiceNumber}
                  </td>
                  <td>{inv.customerName}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <DateCell date={inv.date} />
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{inv.invoiceType}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <MoneyDisplay pennies={inv.totalAmount} />
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <MoneyDisplay pennies={inv.amountDue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
