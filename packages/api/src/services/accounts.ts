import { z } from "zod";
import type {
  Account,
  AccountTransaction,
  LedgerEntry,
  LinkedFeeAllocationSummary,
  UpdateAccountTransactionRequest,
} from "@get-down/shared";
import * as accountsRepo from "../repository/accounts.js";
import { BadRequestError, ConflictError, NotFoundError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";
import { buildPersonName } from "../utils/people.js";
import { groupById } from "../utils/groupById.js";
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
    personName: buildPersonName(r),
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

export async function getLedgerByAccount(
  accountId: number,
  year?: number
): Promise<LedgerEntry[]> {
  const account = await accountsRepo.readAccountById(accountId);
  if (!account) throw new NotFoundError("Account not found");

  const rows = await accountsRepo.readLedgerByAccountId(accountId, year);
  if (rows.length === 0) return [];

  // For transaction entries, fetch their linked allocation IDs and rich summaries in bulk.
  const txIds = rows
    .filter((r) => r.entry_type === 'transaction')
    .map((r) => r.source_id);
  const [allocationsMap, summariesMap] = txIds.length > 0
    ? await Promise.all([
        accountsRepo.readAllocationIdsByTransactionIds(txIds),
        accountsRepo.readLinkedFeeAllocationSummariesByTransactionIds(txIds).then((rows) =>
          groupById(
            rows,
            (r) => r.transaction_id,
            (r): LinkedFeeAllocationSummary => ({
              id: r.allocation_id,
              eventName: r.event_name ?? undefined,
              eventDate: r.event_date ?? undefined,
              gigId: r.gig_id ?? undefined,
              showcaseId: r.showcase_id ?? undefined,
              totalAmount: r.total_fee,
              notes: r.notes ?? undefined,
            })
          )
        ),
      ])
    : [new Map<number, number[]>(), new Map<number, LinkedFeeAllocationSummary[]>()];

  return rows.map((row) => mapLedgerEntry(row, allocationsMap, summariesMap));
}

// ─── Private helpers ──────────────────────────────────────────────────────────


function toDateString(value: string | Date | null): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function mapAccount(row: accountsRepo.AccountSummaryRow): Account {
  const personName = row.is_business ? "Business" : buildPersonName(row);
  return {
    id: row.id,
    personId: row.person_id ?? undefined,
    personName,
    caBalance: row.ca_balance,
    isBusiness: row.is_business,
    isPartner: row.is_partner,
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

function mapLedgerEntry(
  row: accountsRepo.LedgerEntryRow,
  allocationsMap: Map<number, number[]>,
  summariesMap: Map<number, LinkedFeeAllocationSummary[]>
): LedgerEntry {
  return {
    sourceId: row.source_id,
    entryType: row.entry_type,
    accountId: row.account_id,
    date: toDateString(row.date),
    amount: row.amount,
    label: row.label,
    description: row.description ?? undefined,
    feeAllocationIds: row.entry_type === 'transaction'
      ? (allocationsMap.get(row.source_id) ?? [])
      : undefined,
    linkedFeeAllocations: row.entry_type === 'transaction'
      ? (summariesMap.get(row.source_id) ?? [])
      : undefined,
  };
}
