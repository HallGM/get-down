import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Account,
  AccountTransaction,
  LedgerEntry,
  CreateAccountRequest,
  CreateAccountTransactionRequest,
  UpdateAccountTransactionRequest,
} from "@get-down/shared";
import { apiFetch } from "../client.js";
import { useApiMutation } from "./useApiMutation.js";

const KEY = "accounts";
const PEOPLE_KEY = "people-without-accounts";

export function useAccounts() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiFetch<Account[]>("GET", "/accounts"),
  });
}

export function usePeopleWithoutAccounts() {
  return useQuery({
    queryKey: [PEOPLE_KEY],
    queryFn: () => apiFetch<{ id: number; personName: string }[]>("GET", "/accounts/people-without-accounts"),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateAccountRequest) =>
      apiFetch<Account>("POST", "/accounts", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [PEOPLE_KEY] });
    },
    successMessage: "Account created",
  });
}

function accountResourceQuery<T>(accountId: number, segment: string, year?: number) {
  return {
    queryKey: [KEY, accountId, segment, year ?? "all"],
    queryFn: () =>
      apiFetch<T>(
        "GET",
        year != null
          ? `/accounts/${accountId}/${segment}?year=${year}`
          : `/accounts/${accountId}/${segment}`
      ),
    enabled: !!accountId,
  };
}

export function useAccountTransactions(accountId: number, year?: number) {
  return useQuery(accountResourceQuery<AccountTransaction[]>(accountId, "transactions", year));
}

export function useAccountLedger(accountId: number, year?: number) {
  return useQuery(accountResourceQuery<LedgerEntry[]>(accountId, "ledger", year));
}

export function useCreateTransaction(accountId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (input: CreateAccountTransactionRequest) =>
      apiFetch<AccountTransaction>("POST", `/accounts/${accountId}/transactions`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    successMessage: "Transaction added",
  });
}

export function useUpdateTransaction(accountId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateAccountTransactionRequest }) =>
      apiFetch<AccountTransaction>("PUT", `/accounts/${accountId}/transactions/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    successMessage: "Transaction saved",
  });
}

export function useDeleteTransaction(accountId: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (id: number) =>
      apiFetch<void>("DELETE", `/accounts/${accountId}/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    successMessage: "Transaction deleted",
  });
}
