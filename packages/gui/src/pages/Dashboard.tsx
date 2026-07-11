import { useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { useDashboardAlerts } from "../api/hooks/useDashboard.js";
import { formatDate } from "../utils/date.js";
import { formatPennies } from "../utils/money.js";
import Badge from "../components/Badge.js";
import AllocationEventCell from "../components/AllocationEventCell.js";
import SettleAllocationInline from "../components/SettleAllocationInline.js";
import LoadingState from "../components/LoadingState.js";
import ErrorBanner from "../components/ErrorBanner.js";
import { formatGigName } from "../utils/people.js";
import type { FeeAllocationAlert, ExpenseApportionmentMismatchAlert, GigAlertBase, GigPaymentMismatchAlert, RoleWithoutAllocationAlert } from "@get-down/shared";

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

function BalanceCells({ alert }: { alert: GigPaymentMismatchAlert }) {
  return (
    <>
      <td>{formatPennies(alert.billingTotal)}</td>
      <td>{formatPennies(alert.netReceived)}</td>
      <td style={alertCellStyle}>{formatPennies(alert.billingTotal - alert.netReceived)}</td>
    </>
  );
}

function AlertTable({ alerts, showBalance }: { alerts: GigAlertBase[]; showBalance?: boolean }) {
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
          {showBalance && <th>Total</th>}
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
            {showBalance && <BalanceCells alert={g as GigPaymentMismatchAlert} />}
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

function RoleWithoutAllocationTable({ roles }: { roles: RoleWithoutAllocationAlert[] }) {
  if (roles.length === 0) {
    return <AllClear />;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Person</th>
          <th>Role</th>
          <th>Event</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((r) => (
          <tr key={r.id}>
            <td>{r.personName}</td>
            <td>{r.roleName}</td>
            <td><AllocationEventCell eventName={r.eventName} gigId={r.gigId} showcaseId={r.showcaseId} /></td>
            <td>{formatDate(r.eventDate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SettleableAllocationTable({ allocations }: { allocations: FeeAllocationAlert[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
          <th style={{ width: "1%" }}></th>
        </tr>
      </thead>
      <tbody>
        {allocations.map((a) => (
          <Fragment key={a.id}>
            <tr>
              <td>{a.personName ?? <span style={{ color: "var(--pico-muted-color)" }}>Unassigned</span>}</td>
              <td><AllocationEventCell eventName={a.eventName} gigId={a.gigId} showcaseId={a.showcaseId} /></td>
              <td>{a.eventDate ? formatDate(a.eventDate) : "—"}</td>
              <td>{formatPennies(a.totalFee)}</td>
              <td>
                <button
                  type="button"
                  className={expandedId === a.id ? "secondary" : "secondary outline"}
                  style={{ padding: "0.3em 0.7em", fontSize: "0.85em", width: "auto" }}
                  onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                >
                  {expandedId === a.id ? "Hide" : "Settle"}
                </button>
              </td>
            </tr>
            {expandedId === a.id && (
              <tr style={{ background: "var(--pico-muted-border-color, rgba(0,0,0,0.04))" }}>
                <td colSpan={5} style={{ padding: "1rem" }}>
                  <SettleAllocationInline
                    allocation={a}
                    onSettled={() => setExpandedId(null)}
                  />
                </td>
              </tr>
            )}
          </Fragment>
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

function PaymentMismatchTable({ mismatches }: { mismatches: GigPaymentMismatchAlert[] }) {
  if (mismatches.length === 0) {
    return <AllClear />;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Client</th>
          <th>Venue</th>
          <th>Billing total</th>
          <th>Received</th>
          <th>Difference</th>
        </tr>
      </thead>
      <tbody>
        {mismatches.map((m) => {
          const isUnder = m.difference > 0;
          const diffStyle: React.CSSProperties = isUnder
            ? alertCellStyle
            : { color: PICO_ORANGE, fontWeight: 600 };
          return (
            <tr key={m.id}>
              <td>{formatDate(m.date)}</td>
              <td>
                <Link to={`/gigs/${m.id}`}>{formatGigName(m)}</Link>
              </td>
              <td>{m.venueName ?? m.location ?? "—"}</td>
              <td>{formatPennies(m.billingTotal)}</td>
              <td>{formatPennies(m.netReceived)}</td>
              <td style={diffStyle}>
                {formatPennies(Math.abs(m.difference))}{isUnder ? " under" : " over"}
              </td>
            </tr>
          );
        })}
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
            title="No Line Items"
            description="Confirmed gigs with no billing line items. Line items must be added before an invoice can be generated."
            count={data.gigsWithoutLineItems.length}
            badgeColor={PICO_RED}
          >
            <AlertTable alerts={data.gigsWithoutLineItems} />
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
            title="Past Gigs with Payment Mismatches"
            description="Confirmed past gigs where the amount received does not match the billing total. Includes both underpayments and overpayments."
            count={data.pastPaymentMismatches.length}
            badgeColor={PICO_RED}
          >
            <PaymentMismatchTable mismatches={data.pastPaymentMismatches} />
          </DashboardSection>

          <DashboardSection
            title="Fee Allocations Missing Expenses"
            description="Fee allocations with no expense record linked. Settle inline by creating or linking an expense."
            count={data.allocationsWithoutExpenses.length}
            badgeColor={PICO_ORANGE}
          >
            <SettleableAllocationTable allocations={data.allocationsWithoutExpenses} />
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

          <DashboardSection
            title="Gig Roles Missing a Fee Allocation"
            description="Performer roles on past confirmed gigs that do not have a fee allocation linked."
            count={data.gigRolesWithoutAllocation.length}
            badgeColor={PICO_RED}
          >
            <RoleWithoutAllocationTable roles={data.gigRolesWithoutAllocation} />
          </DashboardSection>

          <DashboardSection
            title="Showcase Roles Missing a Fee Allocation"
            description="Performer roles on past showcases that do not have a fee allocation linked."
            count={data.showcaseRolesWithoutAllocation.length}
            badgeColor={PICO_RED}
          >
            <RoleWithoutAllocationTable roles={data.showcaseRolesWithoutAllocation} />
          </DashboardSection>
        </div>
      )}
    </main>
  );
}
