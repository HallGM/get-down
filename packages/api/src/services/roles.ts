import type { Role, CreateRoleRequest, UpdateRoleRequest } from "@get-down/shared";
import * as rolesRepo from "../repository/roles.js";
import { BadRequestError, ConflictError, NotFoundError, isUniqueViolation } from "../errors.js";
import { mapRole, mapRolePerson } from "./role_mappers.js";

export async function getAllRoles(): Promise<Role[]> {
  const rows = await rolesRepo.readAllRoles();
  return rows.map(mapRole);
}

export async function getRoleById(id: number): Promise<Role> {
  const row = await rolesRepo.readRoleById(id);
  if (!row) throw new NotFoundError("Role not found");
  const people = await rolesRepo.readPeopleForRole(id);
  return { ...mapRole(row), people: people.map(mapRolePerson) };
}

export async function createRole(input: CreateRoleRequest): Promise<Role> {
  const name = input.name?.trim();
  if (!name) throw new BadRequestError("name is required");

  try {
    const row = await rolesRepo.createRole(name, input.fee ?? undefined);
    return mapRole(row);
  } catch (err: unknown) {
    if (isUniqueViolation(err)) throw new ConflictError("A role with that name already exists");
    throw err;
  }
}

export async function updateRole(id: number, input: UpdateRoleRequest): Promise<Role> {
  const existing = await getRoleById(id);
  const name = input.name?.trim() ?? existing.name;
  if (!name) throw new BadRequestError("name is required");
  const fee = "fee" in input ? (input.fee ?? null) : (existing.fee ?? null);

  try {
    const row = await rolesRepo.updateRole(id, name, fee);
    if (!row) throw new NotFoundError("Role not found");
    return mapRole(row);
  } catch (err: unknown) {
    if (isUniqueViolation(err)) throw new ConflictError("A role with that name already exists");
    throw err;
  }
}

export async function deleteRole(id: number): Promise<void> {
  const deleted = await rolesRepo.deleteRole(id);
  if (!deleted) throw new NotFoundError("Role not found");
}

export async function getRolesByServiceId(serviceId: number): Promise<Role[]> {
  const rows = await rolesRepo.readRolesByServiceId(serviceId);
  return rows.map(mapServiceRole);
}

export async function addRoleToService(serviceId: number, roleId: number): Promise<void> {
  // Verify role exists
  const role = await rolesRepo.readRoleById(roleId);
  if (!role) throw new NotFoundError("Role not found");
  await rolesRepo.addRoleToService(serviceId, roleId);
}

export async function removeRoleFromService(serviceId: number, roleServicesId: number): Promise<void> {
  const removed = await rolesRepo.removeRoleFromService(roleServicesId, serviceId);
  if (!removed) throw new NotFoundError(`Role slot not found on service ${serviceId}`);
}

function mapServiceRole(row: rolesRepo.ServiceRoleRow): Role {
  return { ...mapRole(row), roleServicesId: row.role_services_id };
}
