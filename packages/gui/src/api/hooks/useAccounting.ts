import { useQuery } from "@tanstack/react-query";
import type { AccountingSummary } from "@get-down/shared";
import { apiFetch } from "../client.js";

const KEY = "accounting";

interface AccountingParams {
  start?: string;
  end?: string;
}

function buildPath(params: AccountingParams): string {
  const search = new URLSearchParams();
  if (params.start !== undefined) search.set("start", params.start);
  if (params.end !== undefined) search.set("end", params.end);
  const qs = search.toString();
  return qs ? `/accounting/summary?${qs}` : "/accounting/summary";
}

export function useAccountingSummary(params: AccountingParams) {
  return useQuery({
    queryKey: [KEY, params.start ?? null, params.end ?? null],
    queryFn: () => apiFetch<AccountingSummary>("GET", buildPath(params)),
  });
}
