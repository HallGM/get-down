import { run_query, withTransaction } from "../db/init.js";

interface AuthPersonRow {
  id: number;
  first_name: string;
  last_name: string | null;
  display_name: string | null;
  email: string;
  password_hash: string | null;
  is_partner: boolean;
  is_active: boolean;
  account_id: number | null;
}

export interface CreateAuthPersonInput {
  firstName: string;
  lastName?: string;
  email: string;
  passwordHash: string;
}

export async function findAuthPersonByEmail(email: string): Promise<AuthPersonRow | null> {
  const rows = await run_query<AuthPersonRow>({
    text: `
      SELECT p.id, p.first_name, p.last_name, p.display_name, p.email, p.password_hash,
             p.is_partner, p.is_active, a.id AS account_id
      FROM people p
      LEFT JOIN accounts a ON a.person_id = p.id
      WHERE lower(email) = lower($1)
      LIMIT 1;
    `,
    values: [email],
  });

  return rows[0] ?? null;
}

export async function findAuthPersonById(id: number): Promise<AuthPersonRow | null> {
  const rows = await run_query<AuthPersonRow>({
    text: `
      SELECT p.id, p.first_name, p.last_name, p.display_name, p.email, p.password_hash,
             p.is_partner, p.is_active, a.id AS account_id
      FROM people p
      LEFT JOIN accounts a ON a.person_id = p.id
      WHERE p.id = $1
      LIMIT 1;
    `,
    values: [id],
  });

  return rows[0] ?? null;
}

export async function createPartnerUser(input: CreateAuthPersonInput): Promise<AuthPersonRow> {
  return withTransaction(async () => {
    const [person] = await run_query<AuthPersonRow>({
      text: `
        INSERT INTO people (first_name, last_name, display_name, email, password_hash, is_partner, is_active)
        VALUES ($1, $2, $3, $4, $5, true, true)
        RETURNING id, first_name, last_name, display_name, email, password_hash, is_partner, is_active, NULL::int AS account_id;
      `,
      values: [
        input.firstName,
        input.lastName ?? null,
        [input.firstName, input.lastName].filter(Boolean).join(" ") || input.firstName,
        input.email,
        input.passwordHash,
      ],
    });
    const [account] = await run_query<{ id: number }>({
      text: `INSERT INTO accounts (person_id) VALUES ($1) RETURNING id;`,
      values: [person.id],
    });
    return { ...person, account_id: account.id };
  });
}