import { useQuery } from "@tanstack/react-query";
import type { DashboardAlerts } from "@get-down/shared";
import { apiFetch } from "../client.js";

const KEY = "dashboard";

export function useDashboardAlerts() {
  return useQuery({
    queryKey: [KEY, "alerts"],
    queryFn: () => apiFetch<DashboardAlerts>("GET", "/dashboard"),
  });
}
