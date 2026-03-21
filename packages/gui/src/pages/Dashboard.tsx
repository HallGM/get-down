import { Link } from "react-router-dom";
import { useGigs } from "../api/hooks/useGigs.js";
import { useEnquiries } from "../api/hooks/useEnquiries.js";
import { useAuth } from "../api/auth.js";
import { formatDate } from "../utils/date.js";
import LoadingState from "../components/LoadingState.js";

function StatCard({ label, value, to }: { label: string; value: number | string; to: string }) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <article style={{ textAlign: "center", padding: "1.5rem" }}>
        <strong style={{ fontSize: "2rem" }}>{value}</strong>
        <p style={{ margin: 0, color: "var(--pico-muted-color)" }}>{label}</p>
      </article>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: gigs, isLoading: gigsLoading } = useGigs();
  const { data: enquiries, isLoading: enquiriesLoading } = useEnquiries();

  const upcomingGigs = gigs?.filter((g) => g.status === "confirmed") ?? [];
  const upcomingEvents = upcomingGigs
    .filter((g) => g.date && new Date(g.date) >= new Date())
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .slice(0, 5);

  return (
    <main className="container">
      <hgroup>
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.displayName ?? user?.firstName}</p>
      </hgroup>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {gigsLoading ? <LoadingState /> : <StatCard label="Gigs" value={gigs?.length ?? 0} to="/gigs" />}
        {enquiriesLoading ? <LoadingState /> : <StatCard label="Enquiries" value={enquiries?.length ?? 0} to="/enquiries" />}
        {gigsLoading ? null : <StatCard label="Confirmed" value={upcomingGigs.length} to="/gigs" />}
      </div>

      <div style={{ display: "grid", gap: "2rem" }}>
        <section>
          <h2>Upcoming Confirmed Gigs</h2>
          {gigsLoading ? (
            <LoadingState />
          ) : upcomingEvents.length === 0 ? (
            <p style={{ color: "var(--pico-muted-color)" }}>No upcoming confirmed gigs.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Date</th><th>Name</th><th>Location</th></tr>
              </thead>
              <tbody>
                {upcomingEvents.map((g) => (
                  <tr key={g.id}>
                    <td>{formatDate(g.date ?? "")}</td>
                    <td>{g.name ?? `${g.firstName} ${g.lastName ?? ""}`.trim()}</td>
                    <td>{g.venueName ?? g.location ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
