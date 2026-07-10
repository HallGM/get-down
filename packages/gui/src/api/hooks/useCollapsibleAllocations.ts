import { useState, useEffect, useCallback } from "react";
import type { FeeAllocation } from "@get-down/shared";

/**
 * Manages collapsible state for fee allocations.
 * Allocations are collapsed by default if they have linked expenses, expanded otherwise.
 * The default state is applied once when data first arrives, then user toggles persist for the session.
 */
export function useCollapsibleAllocations(allocations: FeeAllocation[]) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  // Apply default collapsed/expanded state from fetched data exactly once
  useEffect(() => {
    if (allocations.length > 0 && !defaultsApplied) {
      setDefaultsApplied(true);
      setCollapsed(
        new Set(allocations.filter((a) => a.expenseIds.length > 0).map((a) => a.id))
      );
    }
  }, [allocations, defaultsApplied]);

  const toggle = useCallback((id: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isCollapsed = useCallback((id: number) => collapsed.has(id), [collapsed]);

  return { toggle, isCollapsed };
}
