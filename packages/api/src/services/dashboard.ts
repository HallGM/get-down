import type { DashboardAlerts, GigPaymentAlert, FeeAllocationAlert, ExpenseApportionmentMismatchAlert, GigNoLineItemsAlert } from "@get-down/shared";
import * as repo from "../repository/dashboard.js";
import type { GigPaymentAlertRow, AllocationAlertRow, ApportionmentMismatchRow, GigNoLineItemsAlertRow } from "../repository/dashboard.js";

export async function getDashboardAlerts(): Promise<DashboardAlerts> {
  const [noDepositRows, balanceDueSoonRows, allocationRows, withoutRoleRows, mismatchRows, noLineItemsRows] = await Promise.all([
    repo.readDepositAlerts(),
    repo.readBalanceDueSoonAlerts(),
    repo.readAllocationsWithoutExpenses(),
    repo.readAllocationsWithoutRoles(),
    repo.readApportionmentMismatches(),
    repo.readGigsWithoutLineItems(),
  ]);

  return {
    noDeposit: noDepositRows.map(mapAlert),
    gigsWithoutLineItems: noLineItemsRows.map(mapNoLineItemsAlert),
    balanceDueSoon: balanceDueSoonRows.map(mapAlert),
    allocationsWithoutExpenses: allocationRows.map(mapAllocationAlert),
    allocationsWithoutRoles: withoutRoleRows.map(mapAllocationAlert),
    apportionmentMismatches: mismatchRows.map(mapMismatchAlert),
  };
}

function mapAlert(row: GigPaymentAlertRow): GigPaymentAlert {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    date: toDateString(row.date),
    venueName: row.venue_name ?? undefined,
    location: row.location ?? undefined,
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
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    apportionedTotal: Number(row.apportioned_total),
    difference: Number(row.difference),
  };
}

function mapNoLineItemsAlert(row: GigNoLineItemsAlertRow): GigNoLineItemsAlert {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    date: toDateString(row.date),
    venueName: row.venue_name ?? undefined,
    location: row.location ?? undefined,
  };
}

// ── private helpers ──────────────────────────────────────────────────────────

function toDateString(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10);
}
