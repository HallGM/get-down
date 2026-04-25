import { run_query } from "../db/init.js";

export interface PersonRow {
  id: number;
  first_name: string;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  bank_details: string | null;
  is_partner: boolean;
  is_active: boolean;
  airtable_id: string | null;
  performer_token: string | null;
}

export interface PersonMutationInput {
  firstName: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  bankDetails?: string;
  isPartner: boolean;
  isActive: boolean;
  airtableId?: string;
}

export interface PersonUpdateInput {
  firstName: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  bankDetails?: string;
  isPartner: boolean;
  isActive: boolean;
  airtableId?: string;
}

export async function readPeople(): Promise<PersonRow[]> {
  return run_query<PersonRow>({
    text: `
      SELECT id, first_name, last_name, display_name, email, phone, bank_details, is_partner, is_active, airtable_id, performer_token
      FROM people
      ORDER BY first_name, last_name, id;
    `,
  });
}

export async function readPersonById(id: number): Promise<PersonRow | null> {
  const rows = await run_query<PersonRow>({
    text: `
      SELECT id, first_name, last_name, display_name, email, phone, bank_details, is_partner, is_active, airtable_id, performer_token
      FROM people
      WHERE id = $1
      LIMIT 1;
    `,
    values: [id],
  });

  return rows[0] ?? null;
}

export async function readPersonByPerformerToken(token: string): Promise<PersonRow | null> {
  const rows = await run_query<PersonRow>({
    text: `
      SELECT id, first_name, last_name, display_name, email, phone, bank_details, is_partner, is_active, airtable_id, performer_token
      FROM people
      WHERE performer_token = $1
      LIMIT 1;
    `,
    values: [token],
  });
  return rows[0] ?? null;
}

export async function createPerson(input: PersonMutationInput): Promise<PersonRow> {
  const rows = await run_query<PersonRow>({
    text: `
      INSERT INTO people (first_name, last_name, display_name, email, phone, bank_details, is_partner, is_active, airtable_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, first_name, last_name, display_name, email, phone, bank_details, is_partner, is_active, airtable_id, performer_token;
    `,
    values: [
      input.firstName,
      input.lastName ?? null,
      input.displayName ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.bankDetails ?? null,
      input.isPartner,
      input.isActive,
      input.airtableId ?? null,
    ],
  });
  return rows[0];
}

export async function updatePerson(id: number, input: PersonUpdateInput): Promise<PersonRow | null> {
  const rows = await run_query<PersonRow>({
    text: `
      UPDATE people
      SET first_name = $2,
          last_name = $3,
          display_name = $4,
          email = $5,
          phone = $6,
          bank_details = $7,
          is_partner = $8,
          is_active = $9,
          airtable_id = $10
      WHERE id = $1
      RETURNING id, first_name, last_name, display_name, email, phone, bank_details, is_partner, is_active, airtable_id, performer_token;
    `,
    values: [
      id,
      input.firstName,
      input.lastName ?? null,
      input.displayName ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.bankDetails ?? null,
      input.isPartner,
      input.isActive,
      input.airtableId ?? null,
    ],
  });
  return rows[0] ?? null;
}

export async function deletePerson(id: number): Promise<boolean> {
  const result = await run_query<{ id: number }>({
    text: `DELETE FROM people WHERE id = $1 RETURNING id;`,
    values: [id],
  });

  return result.length > 0;
}

export async function setPerformerToken(id: number, token: string): Promise<PersonRow | null> {
  const rows = await run_query<PersonRow>({
    text: `
      UPDATE people
      SET performer_token = $2
      WHERE id = $1
      RETURNING id, first_name, last_name, display_name, email, phone, bank_details, is_partner, is_active, airtable_id, performer_token;
    `,
    values: [id, token],
  });
  return rows[0] ?? null;
}