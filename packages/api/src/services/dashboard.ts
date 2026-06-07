import type { DashboardAlerts, GigPaymentAlert } from "@get-down/shared";
import * as repo from "../repository/dashboard.js";
import type { GigPaymentAlertRow } from "../repository/dashboard.js";

export async function getDashboardAlerts(): Promise<DashboardAlerts> {
  const [noDepositRows, balanceDueSoonRows] = await Promise.all([
    repo.readDepositAlerts(),
    repo.readBalanceDueSoonAlerts(),
  ]);

  return {
    noDeposit: noDepositRows.map(mapAlert),
    balanceDueSoon: balanceDueSoonRows.map(mapAlert),
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
