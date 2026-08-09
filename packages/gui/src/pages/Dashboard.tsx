import { useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { useDashboardAlerts } from "../api/hooks/useDashboard.js";
import { useExpenses } from "../api/hooks/useExpenses.js";
import { useFeeAllocations } from "../api/hooks/useFeeAllocations.js";
import { useAllAttributionFees } from "../api/hooks/useAttributionFees.js";
import { useCollapsibleAllocations } from "../api/hooks/useCollapsibleAllocations.js";
import { formatDate } from "../utils/date.js";
import { formatPennies } from "../utils/money.js";
import Badge from "../components/Badge.js";
import AllocationEventCell from "../components/AllocationEventCell.js";
import LoadingState from "../components/LoadingState.js";
import ErrorBanner from "../components/ErrorBanner.js";
import { GigFeeAllocationCard } from "../components/GigFeeAllocationCard.js";
import { ShowcaseFeeAllocationCard } from "../components/ShowcaseFeeAllocationCard.js";
import ExpenseModal from "../components/ExpenseModal.js";
import { formatGigName, formatLocation } from "../utils/people.js";
import type { FeeAllocationAlert, ExpenseApportionmentMismatchAlert, GigAlertBase, GigPaymentMismatchAlert, RoleWithoutAllocationAlert, EmptyRoleAlert, FeeAllocationExpenseMismatchAlert, ExpenseOverApportionmentAlert, UnpaidExpenseAlert } from "@get-down/shared";

const PICO_RED = "var(--pico-color-red-500, #e53e3e)";
const PICO_ORANGE = "var(--pico-color-orange-500, #dd6b20)";
const alertCellStyle: React.CSSProperties = { color: PICO_RED, fontWeight: 600 };

function AllClear() {
  return <p style={{ color: "var(--pico-muted-color)" }}>None. All clear.</p>;
}

/**
 * Reusable table component with empty state fallback.
 * Renders empty state if rows are empty, otherwise renders a table with headers and rows.
 */
function TableWithEmpty<T extends { id: number }>({
  rows,
  headers,
  renderRow,
  tableStyle,
}: {
  rows: T[];
  headers: string[];
  renderRow: (row: T) => React.ReactNode;
  tableStyle?: React.CSSProperties;
}) {
  if (rows.length === 0) {
    return <AllClear />;
  }
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{rows.map(renderRow)}</tbody>
    </table>
  );
}

interface DashboardSectionData {
  id: string;
  title: string;
  description: string;
  count: number;
  badgeColor: string;
  content: React.ReactNode;
}

function DashboardSection({
  title,
  description,
  count,
  badgeColor,
  content,
}: Omit<DashboardSectionData, "id">) {
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
      {content}
    </section>
  );
}

function CondensedEmptySections({ sections, hasPopulated }: { sections: DashboardSectionData[]; hasPopulated: boolean }) {
  if (sections.length === 0) {
    return null;
  }
  const heading = hasPopulated ? "Other checks, all clear" : "All checks clear";
  return (
    <section style={{ opacity: 0.6 }}>
      <h2 style={{ fontSize: "0.95rem", fontWeight: 500 }}>{heading}</h2>
      <ul style={{ fontSize: "0.85rem", color: "var(--pico-muted-color)", margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
        {sections.map((s) => (
          <li key={s.id}>{s.title}</li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Factory to create a section descriptor, deriving count from the data array.
 * This ensures count and content always reference the same data source.
 */
function buildSection<T extends { length: number }>(
  id: string,
  title: string,
  description: string,
  badgeColor: string,
  data: T,
  render: (data: T) => React.ReactNode,
): DashboardSectionData {
  return {
    id,
    title,
    description,
    count: data.length,
    badgeColor,
    content: render(data),
  };
}

/**
 * Helper to build a pair of DashboardSectionData descriptors (gigs and showcases)
 * for the same category of fee allocation alert.
 */
function buildGigShowcasePair({
  baseId,
  baseTitle,
  baseDescription,
  gigData,
  showcaseData,
  badgeColor,
  TableComponent,
}: {
  baseId: string;
  baseTitle: string;
  baseDescription: string;
  gigData: FeeAllocationAlert[];
  showcaseData: FeeAllocationAlert[];
  badgeColor: string;
  TableComponent: React.ComponentType<{ allocations: FeeAllocationAlert[] }>;
}): DashboardSectionData[] {
  return [
    buildSection(
      `${baseId}-gigs`,
      `${baseTitle} (Gigs)`,
      `Gig ${baseDescription}`,
      badgeColor,
      gigData,
      (data) => <TableComponent allocations={data} />,
    ),
    buildSection(
      `${baseId}-showcases`,
      `${baseTitle} (Showcases)`,
      `Showcase ${baseDescription}`,
      badgeColor,
      showcaseData,
      (data) => <TableComponent allocations={data} />,
    ),
  ];
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
            <td>{formatLocation(g.venueName, g.location)}</td>
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
          <th>Location</th>
          <th>Fee</th>
        </tr>
      </thead>
      <tbody>
        {allocations.map((a) => (
          <tr key={a.id}>
            <td>{a.personName ?? <span style={{ color: "var(--pico-muted-color)" }}>Unassigned</span>}</td>
            <td><AllocationEventCell eventName={a.eventName} gigId={a.gigId} showcaseId={a.showcaseId} /></td>
            <td>{a.eventDate ? formatDate(a.eventDate) : "—"}</td>
            <td>{formatLocation(a.venueName, a.location)}</td>
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

function EmptyRoleTable({ roles }: { roles: EmptyRoleAlert[] }) {
  if (roles.length === 0) {
    return <AllClear />;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Role</th>
          <th>Event</th>
          <th>Date</th>
          <th>Venue</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((r) => (
          <tr key={r.id}>
            <td>{r.roleName}</td>
            <td><AllocationEventCell eventName={r.eventName} gigId={r.gigId} showcaseId={r.showcaseId} /></td>
            <td>{formatDate(r.eventDate)}</td>
            <td>{formatLocation(r.venueName, r.location)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SettleableAllocationTable({ allocations }: { allocations: FeeAllocationAlert[] }) {
  const { toggle, isCollapsed } = useCollapsibleAllocations(allocations);

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
          <th>Location</th>
          <th>Fee</th>
          <th style={{ width: "1%" }}></th>
        </tr>
      </thead>
      <tbody>
         {allocations.map((a) => {
           const isExpanded = !isCollapsed(a.id);
           return (
             <Fragment key={a.id}>
                <tr>
                  <td>{a.personName ?? <span style={{ color: "var(--pico-muted-color)" }}>Unassigned</span>}</td>
                  <td><AllocationEventCell eventName={a.eventName} gigId={a.gigId} showcaseId={a.showcaseId} /></td>
                  <td>{a.eventDate ? formatDate(a.eventDate) : "—"}</td>
                  <td>{formatLocation(a.venueName, a.location)}</td>
                  <td>{formatPennies(a.totalFee)}</td>
                  <td>
                   <button
                     type="button"
                     className={isExpanded ? "secondary" : "secondary outline"}
                     style={{ padding: "0.3em 0.7em", fontSize: "0.85em", width: "auto" }}
                     onClick={() => toggle(a.id)}
                   >
                     {isExpanded ? "Hide" : "Expand"}
                   </button>
                 </td>
               </tr>
               {isExpanded && (
                 <tr style={{ background: "var(--pico-muted-border-color, rgba(0,0,0,0.04))" }}>
                   <td colSpan={6} style={{ padding: "1rem" }}>
                     {a.gigId ? (
                       <GigFeeAllocationCard
                         gigId={a.gigId}
                         allocationId={a.id}
                         isCollapsed={false}
                         onToggle={() => toggle(a.id)}
                       />
                     ) : a.showcaseId ? (
                       <ShowcaseFeeAllocationCard
                         showcaseId={a.showcaseId}
                         allocationId={a.id}
                         isCollapsed={false}
                         onToggle={() => toggle(a.id)}
                       />
                     ) : null}
                   </td>
                 </tr>
               )}
             </Fragment>
           );
         })}
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

function UnpaidExpensesTable({ expenses, onEditExpense }: { expenses: UnpaidExpenseAlert[]; onEditExpense: (id: number) => void }) {
  return (
    <TableWithEmpty
      rows={expenses}
      headers={["Date", "Description", "Amount", "Paid so far"]}
      tableStyle={{ cursor: "pointer" }}
      renderRow={(exp) => {
        const paidStyle: React.CSSProperties = exp.totalPaid < exp.amount
          ? alertCellStyle
          : { color: PICO_ORANGE, fontWeight: 600 };
        return (
          <tr key={exp.id} onClick={() => onEditExpense(exp.id)}>
            <td>{exp.date ? formatDate(exp.date) : "No date"}</td>
            <td>{exp.description}</td>
            <td>{formatPennies(exp.amount)}</td>
            <td style={paidStyle}>{formatPennies(exp.totalPaid)}</td>
          </tr>
        );
      }}
    />
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
              <td>{formatLocation(m.venueName, m.location)}</td>
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

function FeeAllocationExpenseMismatchTable({ mismatches }: { mismatches: FeeAllocationExpenseMismatchAlert[] }) {
  const { toggle, isCollapsed } = useCollapsibleAllocations(
    mismatches.map((m) => ({ id: m.allocationId }))
  );

  if (mismatches.length === 0) {
    return <AllClear />;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Person</th>
          <th>Event</th>
          <th>Date</th>
          <th>Fee Allocation Total</th>
          <th>Apportioned Expenses</th>
          <th>Difference</th>
          <th style={{ width: "1%" }}></th>
        </tr>
      </thead>
      <tbody>
        {mismatches.map((m) => {
          const isExpanded = !isCollapsed(m.allocationId);
          return (
            <Fragment key={m.allocationId}>
              <tr>
                <td>{m.personName ?? <span style={{ color: "var(--pico-muted-color)" }}>Unassigned</span>}</td>
                <td><AllocationEventCell eventName={m.eventName} gigId={m.gigId} showcaseId={undefined} /></td>
                <td>{m.eventDate ? formatDate(m.eventDate) : "—"}</td>
                <td>{formatPennies(m.allocationTotal)}</td>
                <td>{formatPennies(m.apportionedTotal)}</td>
                <td style={alertCellStyle}>
                  {formatPennies(Math.abs(m.difference))}{m.difference < 0 ? " over" : " under"}
                </td>
                <td>
                  <button
                    type="button"
                    className={isExpanded ? "secondary" : "secondary outline"}
                    style={{ padding: "0.3em 0.7em", fontSize: "0.85em", width: "auto" }}
                    onClick={() => toggle(m.allocationId)}
                  >
                    {isExpanded ? "Hide" : "Apportion"}
                  </button>
                </td>
              </tr>
              {isExpanded && m.gigId && (
                <tr style={{ background: "var(--pico-muted-border-color, rgba(0,0,0,0.04))" }}>
                  <td colSpan={7} style={{ padding: "1rem" }}>
                    <GigFeeAllocationCard
                      gigId={m.gigId}
                      allocationId={m.allocationId}
                      isCollapsed={false}
                      onToggle={() => toggle(m.allocationId)}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function ExpenseOverApportionmentTable({ mismatches }: { mismatches: ExpenseOverApportionmentAlert[] }) {
  const { toggle, isCollapsed } = useCollapsibleAllocations(mismatches.map((m) => ({ id: m.id })));

  if (mismatches.length === 0) {
    return <AllClear />;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Expense</th>
          <th>Total</th>
          <th>Apportioned to Gigs</th>
          <th>Difference</th>
          <th style={{ width: "1%" }}></th>
        </tr>
      </thead>
      <tbody>
        {mismatches.map((m) => {
          const isExpanded = !isCollapsed(m.id);
          return (
            <Fragment key={m.id}>
              <tr>
                <td>{m.description}</td>
                <td>{formatPennies(m.amount)}</td>
                <td>{formatPennies(m.apportionedTotal)}</td>
                <td style={alertCellStyle}>
                  {formatPennies(Math.abs(m.difference))} over
                </td>
                <td>
                  <button
                    type="button"
                    className={isExpanded ? "secondary" : "secondary outline"}
                    style={{ padding: "0.3em 0.7em", fontSize: "0.85em", width: "auto" }}
                    onClick={() => toggle(m.id)}
                  >
                    {isExpanded ? "Hide" : "Apportion"}
                  </button>
                </td>
              </tr>
              {isExpanded && (
                <tr style={{ background: "var(--pico-muted-border-color, rgba(0,0,0,0.04))" }}>
                  <td colSpan={5} style={{ padding: "1rem" }}>
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      {m.allocations.map((a) => (
                        <GigFeeAllocationCard
                          key={a.allocationId}
                          gigId={a.gigId}
                          allocationId={a.allocationId}
                          isCollapsed={false}
                          onToggle={() => toggle(m.id)}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useDashboardAlerts();
  const { data: expenses = [] } = useExpenses();
  
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  const editTarget = editTargetId != null ? expenses.find((e) => e.id === editTargetId) ?? null : null;
  
  // Lazy-load allocations and fees only when modal is open (security: minimize sensitive data in memory)
  // Always call hooks (Rules of Hooks) but disable fetching when modal is closed
  const { data: allAllocations = [] } = useFeeAllocations({ enabled: editTargetId != null });
  const { data: allAttributionFees = [] } = useAllAttributionFees({ enabled: editTargetId != null });

  // Section descriptors in display order; partitioned below by whether they have anything to report
  const sections: DashboardSectionData[] = data ? [
    buildSection(
      "no-deposit",
      "No Deposit Paid",
      "Confirmed upcoming gigs where no payment has been received.",
      PICO_RED,
      data.noDeposit,
      (alerts) => <AlertTable alerts={alerts} />,
    ),
    buildSection(
      "no-line-items",
      "No Line Items",
      "Confirmed gigs with no billing line items. Line items must be added before an invoice can be generated.",
      PICO_RED,
      data.gigsWithoutLineItems,
      (alerts) => <AlertTable alerts={alerts} />,
    ),
    buildSection(
      "balance-due-soon",
      "Balance Due Within 2 Months",
      "Confirmed gigs in the next 2 months with an outstanding balance.",
      PICO_ORANGE,
      data.balanceDueSoon,
      (alerts) => <AlertTable alerts={alerts} showBalance />,
    ),
    buildSection(
      "payment-mismatches",
      "Past Gigs with Payment Mismatches",
      "Confirmed past gigs where the amount received does not match the billing total. Includes both underpayments and overpayments.",
      PICO_RED,
      data.pastPaymentMismatches,
      (mismatches) => <PaymentMismatchTable mismatches={mismatches} />,
    ),
    buildSection(
      "unpaid-expenses",
      "Unpaid Expenses",
      "Expenses where the amount paid does not match the total amount. Includes unpaid and partially paid expenses.",
      PICO_RED,
      data.unpaidExpenses,
      (expenses) => <UnpaidExpensesTable expenses={expenses} onEditExpense={setEditTargetId} />,
    ),
    ...buildGigShowcasePair({
      baseId: "allocations-missing-expenses",
      baseTitle: "Fee Allocations Missing Expenses",
      baseDescription: "fee allocations with no expense record linked. Manage inline by editing line items, linking roles, creating or linking expenses, and more.",
      gigData: data.allocationsWithoutExpensesGigs,
      showcaseData: data.allocationsWithoutExpensesShowcases,
      badgeColor: PICO_ORANGE,
      TableComponent: SettleableAllocationTable,
    }),
    ...buildGigShowcasePair({
      baseId: "partner-allocations-unconfirmed",
      baseTitle: "Partner Fee Allocations Awaiting Confirmation",
      baseDescription: "fee allocations linked to partners that have not been confirmed. Confirm these allocations to mark them as reviewed and correct.",
      gigData: data.unconfirmedPartnerAllocationsGigs,
      showcaseData: data.unconfirmedPartnerAllocationsShowcases,
      badgeColor: PICO_ORANGE,
      TableComponent: SettleableAllocationTable,
    }),
    ...buildGigShowcasePair({
      baseId: "allocations-without-roles",
      baseTitle: "Fee Allocations Not Assigned to a Role",
      baseDescription: "fee allocations that exist without being assigned to a performer role.",
      gigData: data.allocationsWithoutRolesGigs,
      showcaseData: data.allocationsWithoutRolesShowcases,
      badgeColor: PICO_ORANGE,
      TableComponent: AllocationAlertTable,
    }),
    buildSection(
      "apportionment-mismatches",
      "Showcase Apportionment Mismatches",
      "Expenses linked to showcases where the apportioned amounts don't add up to the expense total.",
      PICO_RED,
      data.apportionmentMismatches,
      (mismatches) => <ApportionmentMismatchTable mismatches={mismatches} />,
    ),
    buildSection(
      "allocation-expense-mismatch",
      "Fee Allocations With Mismatched Expense Shares",
      "Gig fee allocations where the total line items don't match the apportioned expense amount.",
      PICO_RED,
      data.feeAllocationExpenseMismatches,
      (mismatches) => <FeeAllocationExpenseMismatchTable mismatches={mismatches} />,
    ),
    buildSection(
      "expense-over-apportioned",
      "Expenses Over-Apportioned Across Gigs",
      "Expenses where the total apportioned amounts across gig fee allocations exceed the expense total.",
      PICO_RED,
      data.expenseOverApportioned,
      (mismatches) => <ExpenseOverApportionmentTable mismatches={mismatches} />,
    ),
    buildSection(
      "gig-roles-without-allocation",
      "Gig Roles Missing a Fee Allocation",
      "Performer roles on past confirmed gigs that do not have a fee allocation linked.",
      PICO_RED,
      data.gigRolesWithoutAllocation,
      (roles) => <RoleWithoutAllocationTable roles={roles} />,
    ),
    buildSection(
      "empty-gig-roles",
      "Empty Gig Role Slots",
      "Performer roles on past confirmed gigs where no person has been assigned.",
      PICO_RED,
      data.emptyGigRoles,
      (roles) => <EmptyRoleTable roles={roles} />,
    ),
    buildSection(
      "showcase-roles-without-allocation",
      "Showcase Roles Missing a Fee Allocation",
      "Performer roles on past showcases that do not have a fee allocation linked.",
      PICO_RED,
      data.showcaseRolesWithoutAllocation,
      (roles) => <RoleWithoutAllocationTable roles={roles} />,
    ),
    buildSection(
      "empty-showcase-roles",
      "Empty Showcase Role Slots",
      "Performer roles on past showcases where no person has been assigned.",
      PICO_RED,
      data.emptyShowcaseRoles,
      (roles) => <EmptyRoleTable roles={roles} />,
    ),
  ] : [];

  // Partition sections into populated and empty
  const populated = sections.filter((s) => s.count > 0);
  const empty = sections.filter((s) => s.count === 0);

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
           {/* Render populated sections */}
           {populated.map(({ id, ...props }) => (
             <DashboardSection key={id} {...props} />
           ))}

          {/* Render condensed empty sections if any exist */}
          <CondensedEmptySections sections={empty} hasPopulated={populated.length > 0} />
        </div>
      )}

      {/* Edit Expense modal (shared component) */}
      <ExpenseModal
        expense={editTarget}
        onClose={() => setEditTargetId(null)}
        allAllocations={allAllocations}
        allAttributionFees={allAttributionFees}
      />
    </main>
  );
}
