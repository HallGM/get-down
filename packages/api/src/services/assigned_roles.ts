import type {
  AssignedRole,
  CreateAssignedRoleRequest,
  UpdateAssignedRoleRequest,
} from "@get-down/shared";
import * as assignedRolesRepo from "../repository/assigned_roles.js";
import { BadRequestError, NotFoundError } from "../errors.js";

export async function getAssignedRolesByGig(gigId: number): Promise<AssignedRole[]> {
  const rows = await assignedRolesRepo.readAssignedRolesByGigId(gigId);
  return rows.map(mapAssignedRole);
}

export async function getAssignedRolesByShowcase(showcaseId: number): Promise<AssignedRole[]> {
  const rows = await assignedRolesRepo.readAssignedRolesByShowcaseId(showcaseId);
  return rows.map(mapAssignedRole);
}

export async function getAssignedRoleById(id: number): Promise<AssignedRole> {
  const row = await assignedRolesRepo.readAssignedRoleById(id);
  if (!row) throw new NotFoundError("AssignedRole not found");
  return mapAssignedRole(row);
}

export async function createAssignedRole(input: CreateAssignedRoleRequest): Promise<AssignedRole> {
  const row = await assignedRolesRepo.createAssignedRole(buildMutationInput(input));
  return mapAssignedRole(row);
}

export async function updateAssignedRole(
  id: number,
  input: UpdateAssignedRoleRequest
): Promise<AssignedRole> {
  const existing = await getAssignedRoleById(id);
  const row = await assignedRolesRepo.updateAssignedRole(id, buildMutationInput(input, existing));
  if (!row) throw new NotFoundError("AssignedRole not found");
  return mapAssignedRole(row);
}

export async function deleteAssignedRole(id: number): Promise<void> {
  const deleted = await assignedRolesRepo.deleteAssignedRole(id);
  if (!deleted) throw new NotFoundError("AssignedRole not found");
}

function mapAssignedRole(row: assignedRolesRepo.AssignedRoleRow): AssignedRole {
  return {
    id: row.id,
    gigId: row.gig_id ?? undefined,
    showcaseId: row.showcase_id ?? undefined,
    personId: row.person_id ?? undefined,
    roleName: row.role_name,
    feeAllocationId: row.fee_allocation_id ?? undefined,
  };
}

function buildMutationInput(
  input: CreateAssignedRoleRequest | UpdateAssignedRoleRequest,
  existing?: AssignedRole
): assignedRolesRepo.AssignedRoleMutationInput {
  const roleName = input.roleName?.trim() ?? existing?.roleName;
  if (!roleName) throw new BadRequestError("roleName is required");

  // personId: null means "explicitly clear"; undefined means "leave unchanged"
  const personId =
    input.personId === undefined
      ? existing?.personId
      : (input.personId ?? undefined);

  return {
    gigId: input.gigId ?? existing?.gigId,
    showcaseId: input.showcaseId ?? existing?.showcaseId,
    personId,
    roleName,
    feeAllocationId: input.feeAllocationId ?? existing?.feeAllocationId,
  };
}
