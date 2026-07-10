import type { ReactNode } from "react";

interface FeeAllocationCardProps {
  title: string;
  isCollapsed: boolean;
  hasExpenses: boolean;
  onToggle: () => void;
  headerActions?: ReactNode;
  children?: ReactNode;
}

/**
 * A collapsible card for displaying fee allocation details.
 * Shows a toggle button, title, and "(settled)" badge in the header.
 * Body content is conditionally rendered based on collapse state.
 */
export function FeeAllocationCard({
  title,
  isCollapsed,
  hasExpenses,
  onToggle,
  headerActions,
  children,
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
          {hasExpenses && (
            <span style={{ color: "var(--pico-muted-color)", fontSize: "0.85em" }}>(settled)</span>
          )}
        </div>
        {!isCollapsed && headerActions}
      </header>
      {!isCollapsed && children}
    </article>
  );
}
