import { run_query } from "../db/init.js";

const PERSON_COLS = `
  id, first_name, last_name, display_name, email, phone, bank_details, business_name,
  address_line_1, address_line_2, address_town, address_county, address_postcode,
  account_number, sort_code, is_partner, is_active, airtable_id, performer_token
`;

export interface PersonRow {
  id: number;
  first_name: string;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  bank_details: string | null;
  business_name: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  address_town: string | null;
  address_county: string | null;
  address_postcode: string | null;
  account_number: string | null;
  sort_code: string | null;
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
  businessName?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressTown?: string;
  addressCounty?: string;
  addressPostcode?: string;
  accountNumber?: string;
  sortCode?: string;
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
  businessName?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressTown?: string;
  addressCounty?: string;
  addressPostcode?: string;
  accountNumber?: string;
  sortCode?: string;
  isPartner: boolean;
  isActive: boolean;
  airtableId?: string;
}

export async function readPeople(): Promise<PersonRow[]> {
  return run_query<PersonRow>({
    text: `
      SELECT ${PERSON_COLS}
      FROM people
      ORDER BY first_name, last_name, id;
    `,
  });
}

export async function readPersonById(id: number): Promise<PersonRow | null> {
  const rows = await run_query<PersonRow>({
    text: `
      SELECT ${PERSON_COLS}
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
      SELECT ${PERSON_COLS}
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
      INSERT INTO people (first_name, last_name, display_name, email, phone, bank_details, business_name,
                         address_line_1, address_line_2, address_town, address_county, address_postcode,
                         account_number, sort_code, is_partner, is_active, airtable_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING ${PERSON_COLS};
    `,
    values: [
      input.firstName,
      input.lastName ?? null,
      input.displayName ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.bankDetails ?? null,
      input.businessName ?? null,
      input.addressLine1 ?? null,
      input.addressLine2 ?? null,
      input.addressTown ?? null,
      input.addressCounty ?? null,
      input.addressPostcode ?? null,
      input.accountNumber ?? null,
      input.sortCode ?? null,
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
          business_name = $8,
          address_line_1 = $9,
          address_line_2 = $10,
          address_town = $11,
          address_county = $12,
          address_postcode = $13,
          account_number = $14,
          sort_code = $15,
          is_partner = $16,
          is_active = $17,
          airtable_id = $18
      WHERE id = $1
      RETURNING ${PERSON_COLS};
    `,
    values: [
      id,
      input.firstName,
      input.lastName ?? null,
      input.displayName ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.bankDetails ?? null,
      input.businessName ?? null,
      input.addressLine1 ?? null,
      input.addressLine2 ?? null,
      input.addressTown ?? null,
      input.addressCounty ?? null,
      input.addressPostcode ?? null,
      input.accountNumber ?? null,
      input.sortCode ?? null,
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
      RETURNING ${PERSON_COLS};
    `,
    values: [id, token],
  });

  return rows[0] ?? null;
}

// ─── Batch lookups ───────────────────────────────────────────────────────────

export async function readPeopleByIds(ids: number[]): Promise<Map<number, PersonRow>> {
  if (ids.length === 0) return new Map();
  const rows = await run_query<PersonRow>({
    text: `SELECT ${PERSON_COLS} FROM people WHERE id = ANY($1::int[]);`,
    values: [ids],
  });
  const result = new Map<number, PersonRow>();
  rows.forEach((row) => result.set(row.id, row));
  return result;
}