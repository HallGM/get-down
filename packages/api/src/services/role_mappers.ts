import type { PersonRoleRow, RolePersonRow } from "../repository/people_roles.js";
import type { Role } from "@get-down/shared";
import type * as rolesRepo from "../repository/roles.js";

export function mapRole(row: rolesRepo.RoleRow): Role {
  return { id: row.id, name: row.name, fee: row.fee ?? undefined, peopleCount: row.people_count ?? 0 };
}

export function mapRoleSummary(row: PersonRoleRow) {
  const role = mapRole(row);
  return { id: role.id, name: role.name, fee: role.fee };
}

export function mapRolePerson(row: RolePersonRow) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? undefined,
    displayName: row.display_name ?? undefined,
    isPartner: row.is_partner,
    isActive: row.is_active,
  };
}
