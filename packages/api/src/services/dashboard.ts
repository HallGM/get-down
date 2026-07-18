import type { DashboardAlerts, GigAlertBase, GigPaymentAlert, FeeAllocationAlert, ExpenseApportionmentMismatchAlert, GigNoLineItemsAlert, GigPaymentMismatchAlert, RoleWithoutAllocationAlert, EmptyRoleAlert, FeeAllocationExpenseMismatchAlert, ExpenseOverApportionmentAlert, ExpenseOverApportionmentAllocationRef } from "@get-down/shared";
import * as repo from "../repository/dashboard.js";
import type { GigAlertBaseRow, GigPaymentAlertRow, AllocationAlertRow, ApportionmentMismatchRow, GigNoLineItemsAlertRow, GigPaymentMismatchAlertRow, RoleWithoutAllocationAlertRow, EmptyRoleAlertRow, FeeAllocationExpenseMismatchRow, ExpenseOverApportionmentRow, ExpenseOverApportionmentAllocationRow } from "../repository/dashboard.js";

export async function getDashboardAlerts(): Promise<DashboardAlerts> {
  const [noDepositRows, balanceDueSoonRows, allocationRows, withoutRoleRows, mismatchRows, noLineItemsRows, paymentMismatchRows, gigRoleRows, showcaseRoleRows, emptyGigRoleRows, emptyShowcaseRoleRows, expenseMismatchRows, overApportionedRows] = await Promise.all([
    repo.readDepositAlerts(),
    repo.readBalanceDueSoonAlerts(),
    repo.readAllocationsWithoutExpenses(),
    repo.readAllocationsWithoutRoles(),
    repo.readApportionmentMismatches(),
    repo.readGigsWithoutLineItems(),
    repo.readPastPaymentMismatches(),
    repo.readGigRolesWithoutAllocation(),
    repo.readShowcaseRolesWithoutAllocation(),
    repo.readEmptyGigRoles(),
    repo.readEmptyShowcaseRoles(),
    repo.readFeeAllocationExpenseMismatches(),
    repo.readExpenseOverApportioned(),
  ]);

  const overApportionedAllocationRows = await repo.readAllocationsForOverApportionedExpenses(
    overApportionedRows.map((r) => r.id)
  );
  const allocationsByExpenseId = groupAllocationsByExpenseId(overApportionedAllocationRows);

  return {
    noDeposit: noDepositRows.map(mapAlert),
    gigsWithoutLineItems: noLineItemsRows.map(mapNoLineItemsAlert),
    balanceDueSoon: balanceDueSoonRows.map(mapPaymentMismatchAlert),
    pastPaymentMismatches: paymentMismatchRows.map(mapPaymentMismatchAlert),
    allocationsWithoutExpenses: allocationRows.map(mapAllocationAlert),
    allocationsWithoutRoles: withoutRoleRows.map(mapAllocationAlert),
    apportionmentMismatches: mismatchRows.map(mapMismatchAlert),
    feeAllocationExpenseMismatches: expenseMismatchRows.map(mapFeeAllocationExpenseMismatch),
    expenseOverApportioned: overApportionedRows.map((row) =>
      mapExpenseOverApportioned(row, allocationsByExpenseId.get(row.id) ?? [])
    ),
    gigRolesWithoutAllocation: gigRoleRows.map(mapRoleWithoutAllocationAlert),
    showcaseRolesWithoutAllocation: showcaseRoleRows.map(mapRoleWithoutAllocationAlert),
    emptyGigRoles: emptyGigRoleRows.map(mapEmptyRoleAlert),
    emptyShowcaseRoles: emptyShowcaseRoleRows.map(mapEmptyRoleAlert),
  };
}

function mapAlert(row: GigPaymentAlertRow): GigPaymentAlert {
  return {
    ...mapGigAlertBase(row),
    totalPrice: row.total_price,
    netReceived: Number(row.net_received),
  };
}

function mapAllocationAlert(row: AllocationAlertRow): FeeAllocationAlert {
  return {
    id: row.id,
    personName: row.person_name ?? undefined,
    eventName: row.event_name ?? `Allocation #${row.id}`,
    eventDate: row.event_date ?? undefined,
    gigId: row.gig_id ?? undefined,
    showcaseId: row.showcase_id ?? undefined,
    totalFee: Number(row.total_fee),
  };
}

function mapMismatchAlert(row: ApportionmentMismatchRow): ExpenseApportionmentMismatchAlert {
  return mapApportionmentAlert(row);
}

function mapNoLineItemsAlert(row: GigNoLineItemsAlertRow): GigNoLineItemsAlert {
  return mapGigAlertBase(row);
}

function mapPaymentMismatchAlert(row: GigPaymentMismatchAlertRow): GigPaymentMismatchAlert {
  return {
    ...mapGigAlertBase(row),
    billingTotal: Number(row.billing_total),
    netReceived: Number(row.net_received),
    difference: Number(row.difference),
  };
}

function mapRoleWithoutAllocationAlert(row: RoleWithoutAllocationAlertRow): RoleWithoutAllocationAlert {
  return {
    ...mapRoleCommon(row),
    personName: row.person_name,
  };
}

function mapEmptyRoleAlert(row: EmptyRoleAlertRow): EmptyRoleAlert {
  return mapRoleCommon(row);
}

function mapFeeAllocationExpenseMismatch(row: FeeAllocationExpenseMismatchRow): FeeAllocationExpenseMismatchAlert {
  return {
    allocationId: row.allocation_id,
    expenseId: row.expense_id,
    personName: row.person_name ?? undefined,
    eventName: row.event_name ?? `Allocation #${row.allocation_id}`,
    eventDate: row.event_date ?? undefined,
    gigId: row.gig_id ?? undefined,
    allocationTotal: Number(row.allocation_total),
    apportionedAmount: Number(row.apportioned_amount),
    difference: Number(row.difference),
  };
}

function mapExpenseOverApportioned(
  row: ExpenseOverApportionmentRow,
  allocations: ExpenseOverApportionmentAllocationRef[]
): ExpenseOverApportionmentAlert {
  return {
    ...mapApportionmentAlert(row),
    allocations,
  };
}

// ── private helpers ──────────────────────────────────────────────────────────

function mapRoleCommon(row: {
  id: number;
  role_name: string;
  event_name: string;
  event_date: string;
  gig_id: number | null;
  showcase_id: number | null;
  venue_name: string | null;
  location: string | null;
}) {
  return {
    id: row.id,
    roleName: row.role_name,
    eventName: row.event_name,
    eventDate: toDateString(row.event_date),
    gigId: row.gig_id ?? undefined,
    showcaseId: row.showcase_id ?? undefined,
    venueName: row.venue_name ?? undefined,
    location: row.location ?? undefined,
  };
}

function mapGigAlertBase(row: GigAlertBaseRow): GigAlertBase {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    date: toDateString(row.date),
    venueName: row.venue_name ?? undefined,
    location: row.location ?? undefined,
  };
}

function mapApportionmentAlert(row: {
  id: number;
  description: string;
  amount: string | number;
  apportioned_total: string | number;
  difference: string | number;
}): {
  id: number;
  description: string;
  amount: number;
  apportionedTotal: number;
  difference: number;
} {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    apportionedTotal: Number(row.apportioned_total),
    difference: Number(row.difference),
  };
}

function toDateString(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10);
}

function groupAllocationsByExpenseId(
  rows: ExpenseOverApportionmentAllocationRow[]
): Map<number, ExpenseOverApportionmentAllocationRef[]> {
  const map = new Map<number, ExpenseOverApportionmentAllocationRef[]>();
  for (const row of rows) {
    const ref: ExpenseOverApportionmentAllocationRef = {
      allocationId: row.allocation_id,
      gigId: row.gig_id,
      personName: row.person_name ?? undefined,
      eventName: row.event_name,
      eventDate: toDateString(row.event_date),
    };
    const existing = map.get(row.expense_id) ?? [];
    existing.push(ref);
    map.set(row.expense_id, existing);
  }
  return map;
}
