import { run_query } from "../db/init.js";

export interface AssignedRoleRow {
  id: number;
  gig_id: number | null;
  showcase_id: number | null;
  person_id: number | null;
  role_name: string;
  fee_allocation_id: number | null;
}

export interface AssignedRoleMutationInput {
  gigId?: number;
  showcaseId?: number;
  personId?: number;
  roleName: string;
  feeAllocationId?: number | null;
}

const SELECT_COLS = `id, gig_id, showcase_id, person_id, role_name, fee_allocation_id`;

export async function createAssignedRole(
  input: AssignedRoleMutationInput
): Promise<AssignedRoleRow> {
  const rows = await run_query<AssignedRoleRow>({
    text: `
      INSERT INTO assigned_roles (gig_id, showcase_id, person_id, role_name, fee_allocation_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.gigId ?? null,
      input.showcaseId ?? null,
      input.personId ?? null,
      input.roleName,
      input.feeAllocationId ?? null,
    ],
  });
  return rows[0];
}

export async function readAssignedRoleById(id: number): Promise<AssignedRoleRow | null> {
  const rows = await run_query<AssignedRoleRow>({
    text: `SELECT ${SELECT_COLS} FROM assigned_roles WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function readAssignedRolesByGigId(gigId: number): Promise<AssignedRoleRow[]> {
  return run_query<AssignedRoleRow>({
    text: `SELECT ${SELECT_COLS} FROM assigned_roles WHERE gig_id = $1 ORDER BY id;`,
    values: [gigId],
  });
}

export async function readAssignedRolesByShowcaseId(
  showcaseId: number
): Promise<AssignedRoleRow[]> {
  return run_query<AssignedRoleRow>({
    text: `SELECT ${SELECT_COLS} FROM assigned_roles WHERE showcase_id = $1 ORDER BY id;`,
    values: [showcaseId],
  });
}

export async function readAssignedRolesByFeeAllocationId(
  feeAllocationId: number
): Promise<AssignedRoleRow[]> {
  return run_query<AssignedRoleRow>({
    text: `SELECT ${SELECT_COLS} FROM assigned_roles WHERE fee_allocation_id = $1 ORDER BY id;`,
    values: [feeAllocationId],
  });
}

export async function updateAssignedRole(
  id: number,
  input: AssignedRoleMutationInput
): Promise<AssignedRoleRow | null> {
  const rows = await run_query<AssignedRoleRow>({
    text: `
      UPDATE assigned_roles
      SET gig_id = $1, showcase_id = $2, person_id = $3, role_name = $4, fee_allocation_id = $5
      WHERE id = $6
      RETURNING ${SELECT_COLS};
    `,
    values: [
      input.gigId ?? null,
      input.showcaseId ?? null,
      input.personId ?? null,
      input.roleName,
      input.feeAllocationId ?? null,
      id,
    ],
  });
  return rows[0] ?? null;
}

export async function deleteAssignedRole(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM assigned_roles WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
