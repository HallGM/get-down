import { run_query } from "../db/init.js";

export interface RoleRow {
  id: number;
  name: string;
  fee: number | null;
}

export interface ServiceRoleRow extends RoleRow {
  role_services_id: number;
}

const COLS = `id, name, fee`;

export async function readAllRoles(): Promise<RoleRow[]> {
  return run_query<RoleRow>({
    text: `SELECT ${COLS} FROM roles ORDER BY name;`,
  });
}

export async function readRoleById(id: number): Promise<RoleRow | null> {
  const rows = await run_query<RoleRow>({
    text: `SELECT ${COLS} FROM roles WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function readRoleByName(name: string): Promise<RoleRow | null> {
  const rows = await run_query<RoleRow>({
    text: `SELECT ${COLS} FROM roles WHERE name = $1 LIMIT 1;`,
    values: [name],
  });
  return rows[0] ?? null;
}

export async function createRole(name: string, fee?: number): Promise<RoleRow> {
  const rows = await run_query<RoleRow>({
    text: `INSERT INTO roles (name, fee) VALUES ($1, $2) RETURNING ${COLS};`,
    values: [name, fee ?? null],
  });
  return rows[0]!;
}

export async function updateRole(id: number, name: string, fee?: number | null): Promise<RoleRow | null> {
  const rows = await run_query<RoleRow>({
    text: `UPDATE roles SET name = $2, fee = $3 WHERE id = $1 RETURNING ${COLS};`,
    values: [id, name, fee ?? null],
  });
  return rows[0] ?? null;
}

export async function deleteRole(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM roles WHERE id = $1 RETURNING id;`,
    values: [id],
  });
  return rows.length > 0;
}

export async function readRolesByServiceId(serviceId: number): Promise<ServiceRoleRow[]> {
  return run_query<ServiceRoleRow>({
    text: `
      SELECT r.id, r.name, r.fee, rs.id AS role_services_id
      FROM roles r
      JOIN role_services rs ON rs.role_id = r.id
      WHERE rs.service_id = $1
      ORDER BY r.name, rs.id;
    `,
    values: [serviceId],
  });
}

export async function addRoleToService(serviceId: number, roleId: number): Promise<void> {
  await run_query({
    text: `INSERT INTO role_services (role_id, service_id) VALUES ($1, $2);`,
    values: [roleId, serviceId],
  });
}

export async function removeRoleFromService(roleServicesId: number, serviceId: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM role_services WHERE id = $1 AND service_id = $2 RETURNING id;`,
    values: [roleServicesId, serviceId],
  });
  return rows.length > 0;
}

export async function readRolesByNames(names: string[]): Promise<RoleRow[]> {
  if (names.length === 0) return [];
  return run_query<RoleRow>({
    text: `SELECT ${COLS} FROM roles WHERE name = ANY($1);`,
    values: [names],
  });
}

export async function readRolesForGigServices(gigId: number): Promise<RoleRow[]> {
  // One row per service-role slot — duplicates intentional when a service has the same role
  // multiple times, so the caller creates one assigned_role slot per row.
  return run_query<RoleRow>({
    text: `
      SELECT r.id, r.name, r.fee
      FROM roles r
      JOIN role_services rs ON rs.role_id = r.id
      JOIN gig_services gs ON gs.service_id = rs.service_id
      WHERE gs.gig_id = $1
      ORDER BY r.name;
    `,
    values: [gigId],
  });
}
