import type { DashboardAlerts, GigPaymentAlert, FeeAllocationAlert, ExpenseApportionmentMismatchAlert } from "@get-down/shared";
import * as repo from "../repository/dashboard.js";
import type { GigPaymentAlertRow, AllocationAlertRow, ApportionmentMismatchRow } from "../repository/dashboard.js";

export async function getDashboardAlerts(): Promise<DashboardAlerts> {
  const [noDepositRows, balanceDueSoonRows, allocationRows, mismatchRows] = await Promise.all([
    repo.readDepositAlerts(),
    repo.readBalanceDueSoonAlerts(),
    repo.readAllocationsWithoutExpenses(),
    repo.readApportionmentMismatches(),
  ]);

  return {
    noDeposit: noDepositRows.map(mapAlert),
    balanceDueSoon: balanceDueSoonRows.map(mapAlert),
    allocationsWithoutExpenses: allocationRows.map(mapAllocationAlert),
    apportionmentMismatches: mismatchRows.map(mapMismatchAlert),
  };
}

function mapAlert(row: GigPaymentAlertRow): GigPaymentAlert {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    date: typeof row.date === "string" ? row.date : (row.date as Date).toISOString().slice(0, 10),
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
