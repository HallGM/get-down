import type { DashboardAlerts, GigAlertBase, GigPaymentAlert, FeeAllocationAlert, ExpenseApportionmentMismatchAlert, GigNoLineItemsAlert, GigPaymentMismatchAlert } from "@get-down/shared";
import * as repo from "../repository/dashboard.js";
import type { GigAlertBaseRow, GigPaymentAlertRow, AllocationAlertRow, ApportionmentMismatchRow, GigNoLineItemsAlertRow, GigPaymentMismatchAlertRow } from "../repository/dashboard.js";

export async function getDashboardAlerts(): Promise<DashboardAlerts> {
  const [noDepositRows, balanceDueSoonRows, allocationRows, withoutRoleRows, mismatchRows, noLineItemsRows, paymentMismatchRows] = await Promise.all([
    repo.readDepositAlerts(),
    repo.readBalanceDueSoonAlerts(),
    repo.readAllocationsWithoutExpenses(),
    repo.readAllocationsWithoutRoles(),
    repo.readApportionmentMismatches(),
    repo.readGigsWithoutLineItems(),
    repo.readPastPaymentMismatches(),
  ]);

  return {
    noDeposit: noDepositRows.map(mapAlert),
    gigsWithoutLineItems: noLineItemsRows.map(mapNoLineItemsAlert),
    balanceDueSoon: balanceDueSoonRows.map(mapPaymentMismatchAlert),
    pastPaymentMismatches: paymentMismatchRows.map(mapPaymentMismatchAlert),
    allocationsWithoutExpenses: allocationRows.map(mapAllocationAlert),
    allocationsWithoutRoles: withoutRoleRows.map(mapAllocationAlert),
    apportionmentMismatches: mismatchRows.map(mapMismatchAlert),
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
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    apportionedTotal: Number(row.apportioned_total),
    difference: Number(row.difference),
  };
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

// ── private helpers ──────────────────────────────────────────────────────────

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

function toDateString(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10);
}
