import { run_query } from "../db/init.js";

export interface AccountSummaryRow {
  id: number;
  person_id: number;
  first_name: string;
  last_name: string | null;
  display_name: string | null;
  ca_balance: number;
}

export interface AccountRow {
  id: number;
  person_id: number;
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
        p.first_name,
        p.last_name,
        p.display_name,
        COALESCE(SUM(t.amount), 0)::int AS ca_balance
      FROM accounts a
      JOIN people p ON p.id = a.person_id
      LEFT JOIN account_transactions t ON t.account_id = a.id
      GROUP BY a.id, a.person_id, p.first_name, p.last_name, p.display_name
      ORDER BY p.first_name, p.last_name;
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
    text: `SELECT id, person_id FROM accounts WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function readTransactionsByAccountId(
  accountId: number,
  year?: number
): Promise<TransactionRow[]> {
  if (year !== undefined) {
    return run_query<TransactionRow>({
      text: `
        SELECT id, account_id, date, amount, type, description
        FROM account_transactions
        WHERE account_id = $1
          AND EXTRACT(YEAR FROM date) = $2
        ORDER BY date DESC, id DESC;
      `,
      values: [accountId, year],
    });
  }
  return run_query<TransactionRow>({
    text: `
      SELECT id, account_id, date, amount, type, description
      FROM account_transactions
      WHERE account_id = $1
      ORDER BY date DESC, id DESC;
    `,
    values: [accountId],
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
