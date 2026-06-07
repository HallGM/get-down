import { Link } from "react-router-dom";
import { useDashboardAlerts } from "../api/hooks/useDashboard.js";
import { formatDate } from "../utils/date.js";
import { formatPennies } from "../utils/money.js";
import Badge from "../components/Badge.js";
import LoadingState from "../components/LoadingState.js";
import ErrorBanner from "../components/ErrorBanner.js";
import { formatGigName } from "../utils/people.js";
import type { GigPaymentAlert } from "@get-down/shared";

function AlertTable({ alerts, showBalance }: { alerts: GigPaymentAlert[]; showBalance?: boolean }) {
  if (alerts.length === 0) {
    return <p style={{ color: "var(--pico-muted-color)" }}>None. All clear.</p>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Client</th>
          <th>Venue</th>
          <th>Quoted</th>
          {showBalance && <th>Received</th>}
          {showBalance && <th>Outstanding</th>}
        </tr>
      </thead>
      <tbody>
        {alerts.map((g) => (
          <tr key={g.id}>
            <td>{formatDate(g.date)}</td>
            <td>
              <Link to={`/gigs/${g.id}`}>{formatGigName(g)}</Link>
            </td>
            <td>{g.venueName ?? g.location ?? "—"}</td>
            <td>{formatPennies(g.totalPrice)}</td>
            {showBalance && <td>{formatPennies(g.netReceived)}</td>}
            {showBalance && (
              <td style={{ color: "var(--pico-color-red-500, #e53e3e)", fontWeight: 600 }}>
                {formatPennies(g.totalPrice - g.netReceived)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useDashboardAlerts();

  return (
    <main className="container">
      <hgroup>
        <h1>Dashboard</h1>
        <p>Monitoring station. Things that need attention.</p>
      </hgroup>

      {isLoading && <LoadingState />}
      {error && <ErrorBanner error={error} />}

      {data && (
        <div style={{ display: "grid", gap: "2rem" }}>
          <section>
            <h2>
              No Deposit Paid
              {data.noDeposit.length > 0 && (
                <Badge
                  label={String(data.noDeposit.length)}
                  background="var(--pico-color-red-500, #e53e3e)"
                  fontSize="0.85rem"
                  style={{ marginLeft: "0.6rem", borderRadius: "999px", padding: "0.1em 0.55em", verticalAlign: "middle" }}
                />
              )}
            </h2>
            <p style={{ color: "var(--pico-muted-color)", fontSize: "0.9rem", marginTop: 0 }}>
              Confirmed upcoming gigs where no payment has been received.
            </p>
            <AlertTable alerts={data.noDeposit} />
          </section>

          <section>
            <h2>
              Balance Due Within 2 Months
              {data.balanceDueSoon.length > 0 && (
                <Badge
                  label={String(data.balanceDueSoon.length)}
                  background="var(--pico-color-orange-500, #dd6b20)"
                  fontSize="0.85rem"
                  style={{ marginLeft: "0.6rem", borderRadius: "999px", padding: "0.1em 0.55em", verticalAlign: "middle" }}
                />
              )}
            </h2>
            <p style={{ color: "var(--pico-muted-color)", fontSize: "0.9rem", marginTop: 0 }}>
              Confirmed gigs in the next 2 months with an outstanding balance.
            </p>
            <AlertTable alerts={data.balanceDueSoon} showBalance />
          </section>
        </div>
      )}
    </main>
  );
}
