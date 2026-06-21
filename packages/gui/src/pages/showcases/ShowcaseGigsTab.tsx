import { Link } from "react-router-dom";
import { useShowcaseGigs } from "../../api/hooks/useShowcases.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import { formatDate } from "../../utils/date.js";

interface Props {
  showcaseId: number;
}

export default function ShowcaseGigsTab({ showcaseId }: Props) {
  const { data: gigs, isLoading, error } = useShowcaseGigs(showcaseId);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorBanner error={error} />;

  if (!gigs || gigs.length === 0) {
    return (
      <p style={{ color: "var(--pico-muted-color)" }}>No gigs linked to this showcase yet.</p>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Client</th>
          <th>Status</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {gigs.map((gig) => (
          <tr key={gig.id}>
            <td>{formatDate(gig.date)}</td>
            <td>
              <Link to={`/gigs/${gig.id}`}>{gig.firstName} {gig.lastName}</Link>
            </td>
            <td>{gig.status}</td>
            <td>{gig.totalPrice != null ? <MoneyDisplay pennies={gig.totalPrice} /> : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
