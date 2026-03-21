import { useQuery } from "@tanstack/react-query";
import type { CalendarEvent } from "@get-down/shared";
import { apiFetch } from "../client.js";

export function useCalendar() {
  return useQuery({
    queryKey: ["calendar"],
    queryFn: () => apiFetch<CalendarEvent[]>("GET", "/calendar"),
  });
}
