import { REFUND_SUBTYPES } from "@get-down/shared";
import { run_query } from "../db/init.js";

export interface VatTransactionRow {
  id: number;
  type: "payment" | "refund";
  date: string | Date;
  amount: number;
  client_first_name: string;
  client_last_name: string;
  refund_subtype: string | null;
}

export interface VatUndatedCounts { payments: number; refunds: number; }

export async function readTransactions(start: string, end: string): Promise<VatTransactionRow[]> {
  return run_query<VatTransactionRow>({
    text: `
      SELECT p.id, 'payment'::text AS type, p.date, p.amount,
             g.first_name AS client_first_name, g.last_name AS client_last_name,
             NULL::text AS refund_subtype
      FROM payments p JOIN gigs g ON g.id = p.gig_id
      WHERE p.date IS NOT NULL AND p.date BETWEEN $1::date AND $2::date
      UNION ALL
      SELECT r.id, 'refund'::text AS type, r.date, r.amount,
             g.first_name AS client_first_name, g.last_name AS client_last_name,
             r.subtype AS refund_subtype
      FROM refunds r JOIN gigs g ON g.id = r.gig_id
      WHERE r.date IS NOT NULL AND r.date BETWEEN $1::date AND $2::date
        AND r.subtype = ANY($3::text[])
      ORDER BY date ASC, id ASC;
    `,
    values: [start, end, [...REFUND_SUBTYPES]],
  });
}

export async function readUndatedCounts(): Promise<VatUndatedCounts> {
  const rows = await run_query<{ payments: number; refunds: number }>({
    text: `SELECT
      (SELECT COUNT(*) FROM payments WHERE date IS NULL)::int AS payments,
      (SELECT COUNT(*) FROM refunds WHERE date IS NULL)::int AS refunds;`,
  });
  return { payments: rows[0]?.payments ?? 0, refunds: rows[0]?.refunds ?? 0 };
}
