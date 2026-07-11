import type { AssignedRole, Person } from "@get-down/shared";
import { resolvePersonName } from "../utils/people.js";

interface LinkedRolesSectionProps {
  linkedRoles: AssignedRole[];
  unlinkedRoles: AssignedRole[];
  people: Person[];
  onUnlinkRole: (roleId: number) => void;
  onLinkRole: (roleId: number) => void;
  isUnlinking?: boolean;
  isLinking?: boolean;
}

export function LinkedRolesSection({
  linkedRoles,
  unlinkedRoles,
  people,
  onUnlinkRole,
  onLinkRole,
  isUnlinking,
  isLinking,
}: LinkedRolesSectionProps) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <strong style={{ fontSize: "0.85em" }}>Linked roles</strong>
      {linkedRoles.length > 0 ? (
        <ul style={{ margin: "0.25rem 0", paddingLeft: "1rem" }}>
          {linkedRoles.map((r) => (
            <li key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>
                {r.roleName}
                {r.personId ? ` (${resolvePersonName(people, r.personId)})` : ""}
              </span>
              <button
                type="button"
                className="contrast outline"
                style={{ padding: "0.1em 0.4em", fontSize: "0.8em" }}
                disabled={isUnlinking}
                onClick={() => onUnlinkRole(r.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: "0.25rem 0", color: "var(--pico-muted-color)", fontSize: "0.85em" }}>
          No roles linked.
        </p>
      )}
      {unlinkedRoles.length > 0 && (
        <select
          value=""
          disabled={isLinking}
          onChange={(e) => {
            if (!e.target.value) return;
            onLinkRole(Number(e.target.value));
          }}
          style={{ margin: "0.25rem 0", fontSize: "0.85em" }}
        >
          <option value="">+ Link role...</option>
          {unlinkedRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.roleName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
