import { mapRole, mapRolePerson, mapRoleSummary } from "./role_mappers.js";
import type { PersonRoleRow, RolePersonRow } from "../repository/people_roles.js";
import type { RoleRow } from "../repository/roles.js";

describe("role mappers", () => {
  test("maps a role with its people count", () => {
    const row: RoleRow = { id: 1, name: "Drums", fee: 12500, people_count: 3 };

    expect(mapRole(row)).toEqual({ id: 1, name: "Drums", fee: 12500, peopleCount: 3 });
  });

  test("maps a role summary without duplicating the full role shape", () => {
    const row: PersonRoleRow = { id: 1, name: "Drums", fee: null };

    expect(mapRoleSummary(row)).toEqual({ id: 1, name: "Drums", fee: undefined });
  });

  test("maps the person fields returned for a role", () => {
    const row: RolePersonRow = {
      id: 2,
      first_name: "Alex",
      last_name: null,
      display_name: "Alex",
      is_partner: true,
      is_active: false,
    };

    expect(mapRolePerson(row)).toEqual({
      id: 2,
      firstName: "Alex",
      lastName: undefined,
      displayName: "Alex",
      isPartner: true,
      isActive: false,
    });
  });
});
