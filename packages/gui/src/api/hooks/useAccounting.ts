import { useQuery } from "@tanstack/react-query";
import type { AccountingSummary } from "@get-down/shared";
import { apiFetch } from "../client.js";

const KEY = "accounting";

interface AccountingParams {
  year?: number;
  taxYearStart?: number;
}

function buildPath(params: AccountingParams): string {
  const search = new URLSearchParams();
  if (params.year !== undefined) search.set("year", String(params.year));
  if (params.taxYearStart !== undefined) search.set("taxYearStart", String(params.taxYearStart));
  const qs = search.toString();
  return qs ? `/accounting/summary?${qs}` : "/accounting/summary";
}

export function useAccountingSummary(params: AccountingParams) {
  return useQuery({
    queryKey: [KEY, params.year ?? null, params.taxYearStart ?? null],
    queryFn: () => apiFetch<AccountingSummary>("GET", buildPath(params)),
  });
}
