import { Link } from "react-router-dom";
import { useDashboardAlerts } from "../api/hooks/useDashboard.js";
import { formatDate } from "../utils/date.js";
import { formatPennies } from "../utils/money.js";
import Badge from "../components/Badge.js";
import AllocationEventCell from "../components/AllocationEventCell.js";
import LoadingState from "../components/LoadingState.js";
import ErrorBanner from "../components/ErrorBanner.js";
import { formatGigName } from "../utils/people.js";
import type { GigPaymentAlert, FeeAllocationAlert, ExpenseApportionmentMismatchAlert } from "@get-down/shared";

const PICO_RED = "var(--pico-color-red-500, #e53e3e)";
const PICO_ORANGE = "var(--pico-color-orange-500, #dd6b20)";
const alertCellStyle: React.CSSProperties = { color: PICO_RED, fontWeight: 600 };

function AllClear() {
  return <p style={{ color: "var(--pico-muted-color)" }}>None. All clear.</p>;
}

function DashboardSection({
  title,
  description,
  count,
  badgeColor,
  children,
}: {
  title: string;
  description: string;
  count: number;
  badgeColor: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2>
        {title}
        {count > 0 && (
          <Badge
            label={String(count)}
            background={badgeColor}
            fontSize="0.85rem"
            style={{ marginLeft: "0.6rem", borderRadius: "999px", padding: "0.1em 0.55em", verticalAlign: "middle" }}
          />
        )}
      </h2>
      <p style={{ color: "var(--pico-muted-color)", fontSize: "0.9rem", marginTop: 0 }}>{description}</p>
      {children}
    </section>
  );
}

function AlertTable({ alerts, showBalance }: { alerts: GigPaymentAlert[]; showBalance?: boolean }) {
  if (alerts.length === 0) {
    return <AllClear />;
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
              <td style={alertCellStyle}>
                {formatPennies(g.totalPrice - g.netReceived)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AllocationAlertTable({ allocations }: { allocations: FeeAllocationAlert[] }) {
  if (allocations.length === 0) {
    return <AllClear />;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Person</th>
          <th>Event</th>
          <th>Date</th>
          <th>Fee</th>
        </tr>
      </thead>
      <tbody>
        {allocations.map((a) => (
          <tr key={a.id}>
            <td>{a.personName ?? <span style={{ color: "var(--pico-muted-color)" }}>Unassigned</span>}</td>
            <td><AllocationEventCell eventName={a.eventName} gigId={a.gigId} showcaseId={a.showcaseId} /></td>
            <td>{a.eventDate ? formatDate(a.eventDate) : "—"}</td>
            <td>{formatPennies(a.totalFee)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ApportionmentMismatchTable({ mismatches }: { mismatches: ExpenseApportionmentMismatchAlert[] }) {
  if (mismatches.length === 0) {
    return <AllClear />;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Expense</th>
          <th>Total</th>
          <th>Apportioned</th>
          <th>Difference</th>
        </tr>
      </thead>
      <tbody>
        {mismatches.map((m) => (
          <tr key={m.id}>
            <td><Link to="/expenses">{m.description}</Link></td>
            <td>{formatPennies(m.amount)}</td>
            <td>{formatPennies(m.apportionedTotal)}</td>
            <td style={alertCellStyle}>
              {formatPennies(Math.abs(m.difference))}{m.difference < 0 ? " over" : " under"}
            </td>
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
          <DashboardSection
            title="No Deposit Paid"
            description="Confirmed upcoming gigs where no payment has been received."
            count={data.noDeposit.length}
            badgeColor={PICO_RED}
          >
            <AlertTable alerts={data.noDeposit} />
          </DashboardSection>

          <DashboardSection
            title="Balance Due Within 2 Months"
            description="Confirmed gigs in the next 2 months with an outstanding balance."
            count={data.balanceDueSoon.length}
            badgeColor={PICO_ORANGE}
          >
            <AlertTable alerts={data.balanceDueSoon} showBalance />
          </DashboardSection>

          <DashboardSection
            title="Fee Allocations Missing Expenses"
            description="Fee allocations with no expense record linked."
            count={data.allocationsWithoutExpenses.length}
            badgeColor={PICO_ORANGE}
          >
            <AllocationAlertTable allocations={data.allocationsWithoutExpenses} />
          </DashboardSection>

          <DashboardSection
            title="Fee Allocations Not Assigned to a Role"
            description="Fee allocations that exist without being assigned to a performer role."
            count={data.allocationsWithoutRoles.length}
            badgeColor={PICO_ORANGE}
          >
            <AllocationAlertTable allocations={data.allocationsWithoutRoles} />
          </DashboardSection>

          <DashboardSection
            title="Showcase Apportionment Mismatches"
            description="Expenses linked to showcases where the apportioned amounts don't add up to the expense total."
            count={data.apportionmentMismatches.length}
            badgeColor={PICO_RED}
          >
            <ApportionmentMismatchTable mismatches={data.apportionmentMismatches} />
          </DashboardSection>
        </div>
      )}
    </main>
  );
}
