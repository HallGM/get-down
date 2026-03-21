import { useGigs } from "../../api/hooks/useGigs.js";
import { useGigInvoices } from "../../api/hooks/useInvoices.js";
import { Link } from "react-router-dom";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import { formatDate } from "../../utils/date.js";

export default function InvoicesList() {
  const { data: gigs, isLoading: gigsLoading, error: gigsError } = useGigs();

  if (gigsLoading) return <main className="container"><LoadingState /></main>;
  if (gigsError) return <main className="container"><ErrorBanner error={gigsError} /></main>;

  return (
    <main className="container">
      <h1>Invoices</h1>
      <p style={{ color: "var(--pico-muted-color)" }}>Select a gig to view its invoices, or open an invoice directly.</p>
      <table>
        <thead>
          <tr><th>Date</th><th>Client</th><th>Venue</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {gigs?.map((g) => (
            <tr key={g.id}>
              <td>{formatDate(g.date)}</td>
              <td>{g.firstName} {g.lastName}</td>
              <td>{g.venueName ?? "—"}</td>
              <td>{g.status}</td>
              <td><Link to={`/invoices?gigId=${g.id}`}>Invoices →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
