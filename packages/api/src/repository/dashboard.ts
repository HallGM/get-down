import { run_query } from "../db/init.js";

export interface GigPaymentAlertRow {
  id: number;
  first_name: string;
  last_name: string;
  date: string;
  venue_name: string | null;
  location: string | null;
  total_price: number;
  net_received: number;
}

const SELECT_ALERT_COLS = `
  g.id,
  g.first_name,
  g.last_name,
  g.date,
  g.venue_name,
  g.location,
  g.total_price,
  COALESCE(p.total_paid, 0) - COALESCE(r.total_refunded, 0) AS net_received
`;

const PAYMENT_SUBQUERY = `
  LEFT JOIN (
    SELECT gig_id, SUM(amount) AS total_paid FROM payments GROUP BY gig_id
  ) p ON p.gig_id = g.id
  LEFT JOIN (
    SELECT gig_id, SUM(amount) AS total_refunded FROM refunds GROUP BY gig_id
  ) r ON r.gig_id = g.id
`;

/**
 * Confirmed upcoming gigs where no payment has been received at all.
 */
export async function readDepositAlerts(): Promise<GigPaymentAlertRow[]> {
  return run_query<GigPaymentAlertRow>({
    text: `
      SELECT ${SELECT_ALERT_COLS}
      FROM gigs g
      ${PAYMENT_SUBQUERY}
      WHERE g.status = 'confirmed'
        AND g.date >= CURRENT_DATE
        AND g.total_price IS NOT NULL
        AND g.total_price > 0
        AND COALESCE(p.total_paid, 0) - COALESCE(r.total_refunded, 0) = 0
      ORDER BY g.date ASC;
    `,
  });
}

/**
 * Confirmed gigs with a date within the next 2 months that still have
 * an outstanding balance (net received < total price).
 */
export async function readBalanceDueSoonAlerts(): Promise<GigPaymentAlertRow[]> {
  return run_query<GigPaymentAlertRow>({
    text: `
      SELECT ${SELECT_ALERT_COLS}
      FROM gigs g
      ${PAYMENT_SUBQUERY}
      WHERE g.status = 'confirmed'
        AND g.date >= CURRENT_DATE
        AND g.date <= CURRENT_DATE + INTERVAL '2 months'
        AND g.total_price IS NOT NULL
        AND g.total_price > 0
        AND COALESCE(p.total_paid, 0) - COALESCE(r.total_refunded, 0) < g.total_price
      ORDER BY g.date ASC;
    `,
  });
}
