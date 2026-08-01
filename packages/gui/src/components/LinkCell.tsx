import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

interface LinkCellProps {
  to: string;
  cellStyle?: CSSProperties;
  children: ReactNode;
}

/**
 * Table cell whose entire area acts as a clickable link (stretched-link technique).
 * The overlay `Link` sits absolutely positioned behind the cell content (not above it),
 * so clicks anywhere on the visible content still reach the link, enabling left-click
 * navigation as well as the browser's native right-click / middle-click / ctrl-click
 * "open in new tab" behaviour.
 */
export default function LinkCell({ to, cellStyle, children }: LinkCellProps) {
  return (
    <td style={{ ...cellStyle, position: "relative" }}>
      <Link
        to={to}
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          textDecoration: "none",
          color: "inherit",
        }}
      />
      {children}
    </td>
  );
}
