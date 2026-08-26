import { useQuery } from "@tanstack/react-query";
import type { VatPeriodMode, VatReport } from "@get-down/shared";
import { apiFetch } from "../client.js";

export function useVatReport(mode: VatPeriodMode, date: string) {
  return useQuery({
    queryKey: ["vat", mode, date],
    queryFn: () => {
      const search = new URLSearchParams({ mode, date });
      return apiFetch<VatReport>("GET", `/vat/report?${search.toString()}`);
    },
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
}
