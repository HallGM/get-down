import type { ReactNode } from "react";

interface FeeAllocationCardProps {
  title: string;
  isCollapsed: boolean;
  hasExpenses: boolean;
  onToggle: () => void;
  headerActions?: ReactNode;
  children?: ReactNode;
  isPartner?: boolean;
  confirmed?: boolean;
  onToggleConfirmed?: (confirmed: boolean) => void;
  isTogglingConfirmed?: boolean;
}

/**
 * A collapsible card for displaying fee allocation details.
 * Shows a toggle button, title, and "(settled)" badge or confirmed checkbox in the header.
 * Body content is conditionally rendered based on collapse state.
 * For partner allocations, shows a confirmation checkbox instead of the "(settled)" badge.
 */
export function FeeAllocationCard({
  title,
  isCollapsed,
  hasExpenses,
  onToggle,
  headerActions,
  children,
  isPartner = false,
  confirmed = false,
  onToggleConfirmed,
  isTogglingConfirmed = false,
}: FeeAllocationCardProps) {
  return (
    <article style={{ margin: 0 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
          <button
            type="button"
            className="secondary outline"
            style={{ padding: "0.1em 0.3em", fontSize: "0.9em", lineHeight: 1, minWidth: "auto" }}
            onClick={onToggle}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? "▶" : "▼"}
          </button>
          <strong>{title}</strong>
          {isPartner ? (
            <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", margin: 0 }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => onToggleConfirmed?.(e.target.checked)}
                disabled={isTogglingConfirmed}
                title="Mark this partner allocation as confirmed"
              />
              <span style={{ fontSize: "0.85em", color: "var(--pico-muted-color)" }}>Confirmed</span>
            </label>
          ) : (
            hasExpenses && (
              <span style={{ color: "var(--pico-muted-color)", fontSize: "0.85em" }}>(settled)</span>
            )
          )}
        </div>
        {!isCollapsed && headerActions}
      </header>
      {!isCollapsed && children}
    </article>
  );
}
