import { useQuery } from "@tanstack/react-query";
import type { VatReport } from "@get-down/shared";
import { apiFetch } from "../client.js";

export function useVatReport(date: string) {
  return useQuery({
    queryKey: ["vat", date],
    queryFn: () => {
      const search = new URLSearchParams({ date });
      return apiFetch<VatReport>("GET", `/vat/report?${search.toString()}`);
    },
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
}
