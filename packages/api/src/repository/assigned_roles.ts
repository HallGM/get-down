import { run_query } from "../db/init.js";

export interface AssignedRoleRow {
  id: number;
  gig_id: number | null;
  showcase_id: number | null;
  person_id: number | null;
  role_name: string;
  fee_allocation_id: number | null;
  role_id: number | null;
}

export interface AssignedRoleMutationInput {
  gigId?: number;
  showcaseId?: number;
  personId?: number;
  roleName: string;
  feeAllocationId?: number | null;
  roleId?: number;
}

const SELECT_COLS = `ar.id, ar.gig_id, ar.showcase_id, ar.person_id, COALESCE(r.name, ar.role_name) AS role_name, ar.fee_allocation_id, ar.role_id`;
const FROM = `assigned_roles ar LEFT JOIN roles r ON r.id = ar.role_id`;

export async function createAssignedRole(
  input: AssignedRoleMutationInput
): Promise<AssignedRoleRow> {
  const rows = await run_query<{ id: number }>({
    text: `
      INSERT INTO assigned_roles (gig_id, showcase_id, person_id, role_name, fee_allocation_id, role_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `,
    values: [
      input.gigId ?? null,
      input.showcaseId ?? null,
      input.personId ?? null,
      input.roleName,
      input.feeAllocationId ?? null,
      input.roleId ?? null,
    ],
  });
  return (await readAssignedRoleById(rows[0]!.id))!;
}

export async function readAssignedRoleById(id: number): Promise<AssignedRoleRow | null> {
  const rows = await run_query<AssignedRoleRow>({
    text: `SELECT ${SELECT_COLS} FROM ${FROM} WHERE ar.id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function readAssignedRolesByGigId(gigId: number): Promise<AssignedRoleRow[]> {
  return run_query<AssignedRoleRow>({
    text: `SELECT ${SELECT_COLS} FROM ${FROM} WHERE ar.gig_id = $1 ORDER BY ar.id;`,
    values: [gigId],
  });
}

export async function readAssignedRolesByShowcaseId(
  showcaseId: number
): Promise<AssignedRoleRow[]> {
  return run_query<AssignedRoleRow>({
    text: `SELECT ${SELECT_COLS} FROM ${FROM} WHERE ar.showcase_id = $1 ORDER BY ar.id;`,
    values: [showcaseId],
  });
}

export async function readAssignedRolesByFeeAllocationId(
  feeAllocationId: number
): Promise<AssignedRoleRow[]> {
  return run_query<AssignedRoleRow>({
    text: `SELECT ${SELECT_COLS} FROM ${FROM} WHERE ar.fee_allocation_id = $1 ORDER BY ar.id;`,
    values: [feeAllocationId],
  });
}

export async function updateAssignedRole(
  id: number,
  input: AssignedRoleMutationInput
): Promise<AssignedRoleRow | null> {
  const rows = await run_query<{ id: number }>({
    text: `
      UPDATE assigned_roles
       SET gig_id = $1, showcase_id = $2, person_id = $3, role_name = $4, fee_allocation_id = $5, role_id = $6
       WHERE id = $7
       RETURNING id;
    `,
    values: [
      input.gigId ?? null,
      input.showcaseId ?? null,
      input.personId ?? null,
      input.roleName,
      input.feeAllocationId ?? null,
      input.roleId ?? null,
      id,
    ],
  });
  return rows[0] ? readAssignedRoleById(rows[0].id) : null;
}

export async function deleteAssignedRole(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM assigned_roles WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}
