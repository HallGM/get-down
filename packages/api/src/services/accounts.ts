import { z } from "zod";
import type {
  Account,
  AccountTransaction,
  UpdateAccountTransactionRequest,
} from "@get-down/shared";
import * as accountsRepo from "../repository/accounts.js";
import { BadRequestError, ConflictError, NotFoundError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";
import { withTransaction } from "../db/init.js";

const CreateAccountSchema = z.object({
  personId: z.number().int().positive("personId is required"),
});

const TransactionSchema = z.object({
  date: z.string().min(1, "date is required"),
  amount: z.number(),
  type: z.string().min(1, "type is required"),
  description: z.string().optional(),
  feeAllocationIds: z.array(z.number()).optional(),
});

const UpdateTransactionSchema = TransactionSchema.partial().extend({
  amount: z.number().optional(),
  type: z.string().min(1).optional(),
});

export async function getAllAccounts(): Promise<Account[]> {
  const rows = await accountsRepo.readAllAccounts();
  return rows.map(mapAccount);
}

export async function createAccount(body: unknown): Promise<Account> {
  const input = parseOrBadRequest(CreateAccountSchema, body);
  try {
    const row = await accountsRepo.createAccount(input.personId);
    // Re-fetch with person name by reading from the list
    const all = await accountsRepo.readAllAccounts();
    const created = all.find((r) => r.id === row.id);
    if (!created) throw new NotFoundError("Account not found after creation");
    return mapAccount(created);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "23505") {
      throw new ConflictError("This person already has an account");
    }
    throw err;
  }
}

export async function getPeopleWithoutAccounts(): Promise<{ id: number; personName: string }[]> {
  const rows = await accountsRepo.readPeopleWithoutAccounts();
  return rows.map((r) => ({
    id: r.id,
    personName: r.display_name ?? `${r.first_name}${r.last_name ? ` ${r.last_name}` : ""}`,
  }));
}

export async function getTransactionsByAccount(
  accountId: number,
  year?: number
): Promise<AccountTransaction[]> {
  const account = await accountsRepo.readAccountById(accountId);
  if (!account) throw new NotFoundError("Account not found");

  const rows = await accountsRepo.readTransactionsByAccountId(accountId, year);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const allocationsMap = await accountsRepo.readAllocationIdsByTransactionIds(ids);
  return rows.map((row) => mapTransaction(row, allocationsMap.get(row.id) ?? []));
}

export async function createTransaction(
  accountId: number,
  body: unknown
): Promise<AccountTransaction> {
  const account = await accountsRepo.readAccountById(accountId);
  if (!account) throw new NotFoundError("Account not found");

  const input = parseOrBadRequest(TransactionSchema, body);

  return withTransaction(async () => {
    const row = await accountsRepo.createTransaction(accountId, {
      date: input.date,
      amount: input.amount,
      type: input.type,
      description: input.description,
    });
    const allocationIds = input.feeAllocationIds ?? [];
    if (allocationIds.length > 0) {
      const found = await accountsRepo.readExistingAllocationIds(allocationIds);
      if (found.length !== allocationIds.length) throw new BadRequestError("One or more fee allocations do not exist");
      await accountsRepo.replaceTransactionAllocations(row.id, allocationIds);
    }
    return mapTransaction(row, allocationIds);
  });
}

export async function updateTransaction(
  id: number,
  accountId: number,
  body: unknown
): Promise<AccountTransaction> {
  const existing = await accountsRepo.readTransactionById(id);
  if (!existing) throw new NotFoundError("Transaction not found");
  if (existing.account_id !== accountId) throw new NotFoundError("Transaction not found");

  const input = parseOrBadRequest(UpdateTransactionSchema, body) as UpdateAccountTransactionRequest;

  const merged = {
    date: input.date ?? toDateString(existing.date),
    amount: input.amount ?? existing.amount,
    type: input.type ?? existing.type,
    description: input.description ?? existing.description ?? undefined,
  };

  return withTransaction(async () => {
    const row = await accountsRepo.updateTransaction(id, merged);
    if (!row) throw new NotFoundError("Transaction not found");

    if (input.feeAllocationIds !== undefined) {
      if (input.feeAllocationIds.length > 0) {
        const found = await accountsRepo.readExistingAllocationIds(input.feeAllocationIds);
        if (found.length !== input.feeAllocationIds.length) throw new BadRequestError("One or more fee allocations do not exist");
      }
      await accountsRepo.replaceTransactionAllocations(id, input.feeAllocationIds);
    }

    const allocationIds = input.feeAllocationIds
      ?? await accountsRepo.readAllocationIdsByTransactionId(id);

    return mapTransaction(row, allocationIds);
  });
}

export async function deleteTransaction(id: number, accountId: number): Promise<void> {
  const existing = await accountsRepo.readTransactionById(id);
  if (!existing) throw new NotFoundError("Transaction not found");
  if (existing.account_id !== accountId) throw new NotFoundError("Transaction not found");
  await accountsRepo.deleteTransaction(id);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function toDateString(value: string | Date | null): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function mapAccount(row: accountsRepo.AccountSummaryRow): Account {
  return {
    id: row.id,
    personId: row.person_id,
    personName: row.display_name ?? `${row.first_name}${row.last_name ? ` ${row.last_name}` : ""}`,
    caBalance: row.ca_balance,
  };
}

function mapTransaction(
  row: accountsRepo.TransactionRow,
  feeAllocationIds: number[]
): AccountTransaction {
  return {
    id: row.id,
    accountId: row.account_id,
    date: toDateString(row.date),
    amount: row.amount,
    type: row.type,
    description: row.description ?? undefined,
    feeAllocationIds,
  };
}
