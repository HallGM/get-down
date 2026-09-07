import { jest } from "@jest/globals";
import type { PersonRow } from "../repository/people.js";
import type { RoleRow } from "../repository/roles.js";

const readPersonById = jest.fn<(id: number) => Promise<PersonRow | null>>();
const readRoleById = jest.fn<(id: number) => Promise<RoleRow | null>>();
const addPersonRole = jest.fn<(personId: number, roleId: number) => Promise<void>>();
const removePersonRole = jest.fn<(personId: number, roleId: number) => Promise<boolean>>();
const readRolesForPerson = jest.fn();

jest.unstable_mockModule("../repository/people.js", () => ({ readPersonById }));
jest.unstable_mockModule("../repository/roles.js", () => ({ readRoleById }));
jest.unstable_mockModule("../repository/people_roles.js", () => ({
  addPersonRole,
  removePersonRole,
  readRolesForPerson,
}));

const { addRoleToPerson, getPersonRoles, removeRoleFromPerson } = await import("./people_roles.js");

const person = { id: 1 } as PersonRow;
const role = { id: 2, name: "Drums", fee: null } as RoleRow;

describe("people role capabilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readPersonById.mockResolvedValue(person);
    readRoleById.mockResolvedValue(role);
    addPersonRole.mockResolvedValue(undefined);
    removePersonRole.mockResolvedValue(true);
  });

  test("adds a capability only after validating both records", async () => {
    await addRoleToPerson(1, { roleId: 2 });
    expect(readPersonById).toHaveBeenCalledWith(1);
    expect(readRoleById).toHaveBeenCalledWith(2);
    expect(addPersonRole).toHaveBeenCalledWith(1, 2);
  });

  test("returns a not-found error when removing a missing capability", async () => {
    removePersonRole.mockResolvedValue(false);
    await expect(removeRoleFromPerson(1, 2)).rejects.toThrow("Person role not found");
  });

  test("validates the person before reading its capabilities", async () => {
    readPersonById.mockResolvedValue(null);
    await expect(getPersonRoles(1)).rejects.toThrow("Person not found");
    expect(readRolesForPerson).not.toHaveBeenCalled();
  });
});
