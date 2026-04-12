import { Link, useParams } from "react-router-dom";
import { usePerformer } from "../../api/hooks/usePerformer.js";
import { formatDate } from "../../utils/date.js";

export default function PerformerGigList() {
  const { token = "" } = useParams<{ token: string }>();
  const { data, isLoading, error } = usePerformer(token);

  if (isLoading) {
    return (
      <main className="container">
        <header style={{ borderBottom: "1px solid var(--pico-muted-border-color)", marginBottom: "2rem", paddingBottom: "1rem" }}>
          <strong>Every Angle</strong>
        </header>
        <p aria-busy="true">Loading…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container">
        <header style={{ borderBottom: "1px solid var(--pico-muted-border-color)", marginBottom: "2rem", paddingBottom: "1rem" }}>
          <strong>Every Angle</strong>
        </header>
        <article>
          <p>Performer link not found. Please check your link or contact Every Angle.</p>
        </article>
      </main>
    );
  }

  const { person, gigs } = data;
  const displayName = person.displayName ?? `${person.firstName}${person.lastName ? ` ${person.lastName}` : ""}`;

  return (
    <main className="container">
      <header style={{ borderBottom: "1px solid var(--pico-muted-border-color)", marginBottom: "2rem", paddingBottom: "1rem" }}>
        <strong>Every Angle</strong>
      </header>

      <hgroup>
        <h1>{displayName}</h1>
        <p>Your upcoming gigs</p>
      </hgroup>

      {gigs.length === 0 ? (
        <article>
          <p style={{ color: "var(--pico-muted-color)" }}>No upcoming gigs at the moment. Check back soon!</p>
        </article>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Venue</th>
            </tr>
          </thead>
          <tbody>
            {gigs.map((gig) => (
              <tr key={gig.id} style={{ cursor: "pointer" }}>
                <td>
                  <Link to={`/p/${token}/gigs/${gig.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    {formatDate(gig.date)}
                  </Link>
                </td>
                <td>
                  <Link to={`/p/${token}/gigs/${gig.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    {gig.firstName} {gig.lastName}
                  </Link>
                </td>
                <td>
                  <Link to={`/p/${token}/gigs/${gig.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    {gig.venueName ?? gig.location ?? "—"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
