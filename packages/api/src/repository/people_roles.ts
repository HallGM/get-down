import { run_query } from "../db/init.js";

export interface PersonRoleRow { id: number; name: string; fee: number | null; }
export interface RolePersonRow {
  id: number;
  first_name: string;
  last_name: string | null;
  display_name: string | null;
  is_partner: boolean;
  is_active: boolean;
}

export async function readRolesForPerson(personId: number): Promise<PersonRoleRow[]> {
  return run_query<PersonRoleRow>({ text: `SELECT r.id, r.name, r.fee FROM people_roles pr JOIN roles r ON r.id = pr.role_id WHERE pr.person_id = $1 ORDER BY r.name;`, values: [personId] });
}

export async function readPeopleForRole(roleId: number): Promise<RolePersonRow[]> {
  return run_query<RolePersonRow>({ text: `SELECT p.id, p.first_name, p.last_name, p.display_name, p.is_partner, p.is_active FROM people_roles pr JOIN people p ON p.id = pr.person_id WHERE pr.role_id = $1 ORDER BY p.first_name, p.last_name, p.id;`, values: [roleId] });
}

export async function addPersonRole(personId: number, roleId: number): Promise<void> {
  await run_query({ text: `INSERT INTO people_roles (person_id, role_id) VALUES ($1, $2) ON CONFLICT (person_id, role_id) DO NOTHING;`, values: [personId, roleId] });
}

export async function removePersonRole(personId: number, roleId: number): Promise<boolean> {
  const rows = await run_query<{ person_id: number }>({ text: `DELETE FROM people_roles WHERE person_id = $1 AND role_id = $2 RETURNING person_id;`, values: [personId, roleId] });
  return rows.length > 0;
}
