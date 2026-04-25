import type { Role, CreateRoleRequest, UpdateRoleRequest } from "@get-down/shared";
import * as rolesRepo from "../repository/roles.js";
import { BadRequestError, ConflictError, NotFoundError } from "../errors.js";

export async function getAllRoles(): Promise<Role[]> {
  const rows = await rolesRepo.readAllRoles();
  return rows.map(mapRole);
}

export async function getRoleById(id: number): Promise<Role> {
  const row = await rolesRepo.readRoleById(id);
  if (!row) throw new NotFoundError("Role not found");
  return mapRole(row);
}

export async function createRole(input: CreateRoleRequest): Promise<Role> {
  const name = input.name?.trim();
  if (!name) throw new BadRequestError("name is required");

  try {
    const row = await rolesRepo.createRole(name);
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

  try {
    const row = await rolesRepo.updateRole(id, name);
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
  return rows.map(mapRole);
}

export async function addRoleToService(serviceId: number, roleId: number): Promise<void> {
  // Verify role exists
  const role = await rolesRepo.readRoleById(roleId);
  if (!role) throw new NotFoundError("Role not found");
  await rolesRepo.addRoleToService(serviceId, roleId);
}

export async function removeRoleFromService(serviceId: number, roleId: number): Promise<void> {
  const removed = await rolesRepo.removeRoleFromService(serviceId, roleId);
  if (!removed) throw new NotFoundError("Role not linked to this service");
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function mapRole(row: rolesRepo.RoleRow): Role {
  return { id: row.id, name: row.name };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}
