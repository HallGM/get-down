import { run_query } from "../db/init.js";

export interface RoleRow {
  id: number;
  name: string;
}

export async function readAllRoles(): Promise<RoleRow[]> {
  return run_query<RoleRow>({
    text: `SELECT id, name FROM roles ORDER BY name;`,
  });
}

export async function readRoleById(id: number): Promise<RoleRow | null> {
  const rows = await run_query<RoleRow>({
    text: `SELECT id, name FROM roles WHERE id = $1 LIMIT 1;`,
    values: [id],
  });
  return rows[0] ?? null;
}

export async function createRole(name: string): Promise<RoleRow> {
  const rows = await run_query<RoleRow>({
    text: `INSERT INTO roles (name) VALUES ($1) RETURNING id, name;`,
    values: [name],
  });
  return rows[0]!;
}

export async function updateRole(id: number, name: string): Promise<RoleRow | null> {
  const rows = await run_query<RoleRow>({
    text: `UPDATE roles SET name = $2 WHERE id = $1 RETURNING id, name;`,
    values: [id, name],
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

export async function readRolesByServiceId(serviceId: number): Promise<RoleRow[]> {
  return run_query<RoleRow>({
    text: `
      SELECT r.id, r.name
      FROM roles r
      JOIN role_services rs ON rs.role_id = r.id
      WHERE rs.service_id = $1
      ORDER BY r.name;
    `,
    values: [serviceId],
  });
}

export async function addRoleToService(serviceId: number, roleId: number): Promise<void> {
  await run_query({
    text: `
      INSERT INTO role_services (role_id, service_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `,
    values: [roleId, serviceId],
  });
}

export async function removeRoleFromService(serviceId: number, roleId: number): Promise<boolean> {
  const rows = await run_query<{ role_id: number }>({
    text: `DELETE FROM role_services WHERE role_id = $1 AND service_id = $2 RETURNING role_id;`,
    values: [roleId, serviceId],
  });
  return rows.length > 0;
}

export async function readRolesForGigServices(gigId: number): Promise<RoleRow[]> {
  // One row per service-role combination — intentional duplicates when two services
  // share the same role name, so the caller creates one assigned_role slot per row.
  return run_query<RoleRow>({
    text: `
      SELECT r.id, r.name
      FROM roles r
      JOIN role_services rs ON rs.role_id = r.id
      JOIN gig_services gs ON gs.service_id = rs.service_id
      WHERE gs.gig_id = $1
      ORDER BY r.name;
    `,
    values: [gigId],
  });
}
