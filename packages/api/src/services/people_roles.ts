import * as peopleRepo from "../repository/people.js";
import * as rolesRepo from "../repository/roles.js";
import * as rolesService from "./roles.js";
import * as repo from "../repository/people_roles.js";
import { mapRoleSummary } from "./role_mappers.js";
import { NotFoundError } from "../errors.js";
import { z } from "zod";
import { parseOrBadRequest } from "../utils/parse.js";

export async function getPersonRoles(personId: number) {
  if (!(await peopleRepo.readPersonById(personId))) throw new NotFoundError("Person not found");
  return (await repo.readRolesForPerson(personId)).map(mapRoleSummary);
}

export async function getRolePeople(roleId: number) {
  return (await rolesService.getRoleById(roleId)).people ?? [];
}

export async function addRoleToPerson(personId: number, body: unknown): Promise<void> {
  const { roleId } = parseOrBadRequest(AddPersonRoleSchema, body);
  if (!(await peopleRepo.readPersonById(personId))) throw new NotFoundError("Person not found");
  if (!(await rolesRepo.readRoleById(roleId))) throw new NotFoundError("Role not found");
  await repo.addPersonRole(personId, roleId);
}

export async function removeRoleFromPerson(personId: number, roleId: number): Promise<void> {
  if (!(await repo.removePersonRole(personId, roleId))) throw new NotFoundError("Person role not found");
}

const AddPersonRoleSchema = z.object({
  roleId: z.number().int().positive(),
});
