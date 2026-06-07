import { run_query } from "../db/init.js";
import { SQL_EVENT_COLS, SQL_SHOWCASE_LATERAL_JOIN, SQL_EVENT_GROUP_BY_COLS } from "./sql-fragments.js";

export interface AccountSummaryRow {
  id: number;
  person_id: number | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  ca_balance: number;
  is_business: boolean;
}

export interface AccountRow {
  id: number;
  person_id: number | null;
  is_business: boolean;
}

export interface PersonNameRow {
  id: number;
  first_name: string;
  last_name: string | null;
  display_name: string | null;
}

export interface TransactionRow {
  id: number;
  account_id: number;
  date: string | null;
  amount: number;
  type: string;
  description: string | null;
}

export interface LedgerEntryRow {
  source_id: number;
  entry_type: 'transaction' | 'allocation' | 'expense_payment' | 'gig_payment' | 'drawing';
  account_id: number;
  person_id: number | null;
  date: string | null;
  amount: number;
  label: string;
  description: string | null;
}

export interface TransactionMutationInput {
  date?: string;
  amount: number;
  type: string;
  description?: string;
}

export async function readAllAccounts(): Promise<AccountSummaryRow[]> {
  return run_query<AccountSummaryRow>({
    text: `
      SELECT
        a.id,
        a.person_id,
        a.is_business,
        p.first_name,
        p.last_name,
        p.display_name,
        COALESCE(SUM(l.amount), 0)::int AS ca_balance
      FROM accounts a
      LEFT JOIN people p ON p.id = a.person_id
      LEFT JOIN account_ledger l ON l.account_id = a.id
      GROUP BY a.id, a.person_id, a.is_business, p.first_name, p.last_name, p.display_name
      ORDER BY a.is_business DESC, p.first_name, p.last_name;
    `,
  });
}

export async function createAccount(personId: number): Promise<AccountRow> {
  const rows = await run_query<AccountRow>({
    text: `INSERT INTO accounts (person_id) VALUES ($1) RETURNING id, person_id;`,
    values: [personId],
  });
  return rows[0];
}

export async function readPeopleWithoutAccounts(): Promise<PersonNameRow[]> {
  return run_query<PersonNameRow>({
    text: `
      SELECT p.id, p.first_name, p.last_name, p.display_name
      FROM people p
      WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.person_id = p.id)
      ORDER BY p.first_name, p.last_name;
    `,
  });
}

export async function readAccountById(id: number): Promise<AccountRow | null> {
  const rows = await run_query<AccountRow>({
    text: `SELECT id, person_id, is_business FROM accounts WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function readAccountByPersonId(personId: number): Promise<AccountRow | null> {
  const rows = await run_query<AccountRow>({
    text: `SELECT id, person_id, is_business FROM accounts WHERE person_id = $1 LIMIT 1;`,
    values: [personId],
  });
  return rows[0] ?? null;
}

export async function readTransactionsByAccountId(
  accountId: number,
  year?: number
): Promise<TransactionRow[]> {
  const yearFilter = year !== undefined ? `AND EXTRACT(YEAR FROM date) = $2` : "";
  return run_query<TransactionRow>({
    text: `
      SELECT id, account_id, date, amount, type, description
      FROM account_transactions
      WHERE account_id = $1 ${yearFilter}
      ORDER BY date DESC, id DESC;
    `,
    values: year !== undefined ? [accountId, year] : [accountId],
  });
}

export async function readTransactionById(id: number): Promise<TransactionRow | null> {
  const rows = await run_query<TransactionRow>({
    text: `
      SELECT id, account_id, date, amount, type, description
      FROM account_transactions WHERE id = $1 LIMIT 1;
    `,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function createTransaction(
  accountId: number,
  input: TransactionMutationInput
): Promise<TransactionRow> {
  const rows = await run_query<TransactionRow>({
    text: `
      INSERT INTO account_transactions (account_id, date, amount, type, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, account_id, date, amount, type, description;
    `,
    values: [
      accountId,
      input.date ?? null,
      input.amount,
      input.type,
      input.description ?? null,
    ],
  });
  return rows[0];
}

export async function updateTransaction(
  id: number,
  input: TransactionMutationInput
): Promise<TransactionRow | null> {
  const rows = await run_query<TransactionRow>({
    text: `
      UPDATE account_transactions
      SET date = $2, amount = $3, type = $4, description = $5
      WHERE id = $1
      RETURNING id, account_id, date, amount, type, description;
    `,
    values: [id, input.date ?? null, input.amount, input.type, input.description ?? null],
  });
  return rows[0] ?? null;
}

export async function deleteTransaction(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM account_transactions WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

export async function readLedgerByAccountId(
  accountId: number,
  year?: number
): Promise<LedgerEntryRow[]> {
  const yearFilter = year !== undefined ? `AND EXTRACT(YEAR FROM date) = $2` : "";
  return run_query<LedgerEntryRow>({
    text: `
      SELECT source_id, entry_type, account_id, person_id, date, amount, label, description
      FROM account_ledger
      WHERE account_id = $1 ${yearFilter}
      ORDER BY date DESC NULLS LAST, source_id DESC;
    `,
    values: year !== undefined ? [accountId, year] : [accountId],
  });
}

export async function readAllocationIdsByTransactionId(
  transactionId: number
): Promise<number[]> {
  const rows = await run_query<{ allocation_id: number }>({
    text: `
      SELECT allocation_id
      FROM account_transactions_fee_allocations
      WHERE transaction_id = $1
      ORDER BY allocation_id;
    `,
    values: [transactionId],
  });
  return rows.map((r) => r.allocation_id);
}

export async function readAllocationIdsByTransactionIds(
  transactionIds: number[]
): Promise<Map<number, number[]>> {
  if (transactionIds.length === 0) return new Map();
  const rows = await run_query<{ transaction_id: number; allocation_id: number }>({
    text: `
      SELECT transaction_id, allocation_id
      FROM account_transactions_fee_allocations
      WHERE transaction_id = ANY($1::int[])
      ORDER BY transaction_id, allocation_id;
    `,
    values: [transactionIds],
  });
  const map = new Map<number, number[]>();
  for (const row of rows) {
    const list = map.get(row.transaction_id) ?? [];
    list.push(row.allocation_id);
    map.set(row.transaction_id, list);
  }
  return map;
}

export async function readExistingAllocationIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const rows = await run_query<{ id: number }>({
    text: `SELECT id FROM fee_allocations WHERE id = ANY($1::int[]);`,
    values: [ids],
  });
  return rows.map((r) => r.id);
}

export interface LinkedFeeAllocationSummaryRow {
  transaction_id: number;
  allocation_id: number;
  event_name: string | null;
  event_date: string | null;
  gig_id: number | null;
  showcase_id: number | null;
  total_fee: number;
  notes: string | null;
}

export async function readLinkedFeeAllocationSummariesByTransactionIds(
  transactionIds: number[]
): Promise<LinkedFeeAllocationSummaryRow[]> {
  if (transactionIds.length === 0) return [];
  return run_query<LinkedFeeAllocationSummaryRow>({
    text: `
      SELECT
        atfa.transaction_id,
        fa.id AS allocation_id,
        ${SQL_EVENT_COLS},
        COALESCE(SUM(li.amount), 0)::int AS total_fee,
        fa.notes
      FROM account_transactions_fee_allocations atfa
      JOIN fee_allocations fa ON fa.id = atfa.allocation_id
      LEFT JOIN gigs g ON g.id = fa.gig_id
      ${SQL_SHOWCASE_LATERAL_JOIN}
      LEFT JOIN fee_allocation_line_items li ON li.allocation_id = fa.id
      WHERE atfa.transaction_id = ANY($1::int[])
      GROUP BY
        atfa.transaction_id,
        fa.id,
        fa.notes,
        ${SQL_EVENT_GROUP_BY_COLS}
      ORDER BY atfa.transaction_id, fa.id;
    `,
    values: [transactionIds],
  });
}

export async function replaceTransactionAllocations(
  transactionId: number,
  allocationIds: number[]
): Promise<void> {
  await run_query({
    text: `DELETE FROM account_transactions_fee_allocations WHERE transaction_id = $1;`,
    values: [transactionId],
  });
  if (allocationIds.length > 0) {
    await run_query({
      text: `
        INSERT INTO account_transactions_fee_allocations (transaction_id, allocation_id)
        SELECT $1, unnest($2::int[])
        ON CONFLICT DO NOTHING;
      `,
      values: [transactionId, allocationIds],
    });
  }
}
