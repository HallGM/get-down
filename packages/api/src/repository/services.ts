import { run_query } from "../db/init.js";

export interface ServiceRow {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  price_to_client: number | null;
  extra_fee: number | null;
  extra_fee_description: string | null;
  is_band: boolean;
  is_dj_only: boolean;
  requires_meal: boolean;
  is_active: boolean;
  airtable_id: string | null;
  number_of_people: number;
}

export interface ServiceMutationInput {
  name: string;
  category?: string;
  description?: string;
  priceToClient?: number;
  extraFee?: number;
  extraFeeDescription?: string;
  isBand: boolean;
  isDjOnly: boolean;
  requiresMeal: boolean;
  isActive: boolean;
  airtableId?: string;
}

const COLS = `
  id, name, category, description, price_to_client,
  extra_fee, extra_fee_description, is_band, is_dj_only, requires_meal, is_active, airtable_id,
  (SELECT COUNT(*) FROM role_services rs WHERE rs.service_id = id)::int AS number_of_people
`;

export async function createService(input: ServiceMutationInput): Promise<ServiceRow> {
  const rows = await run_query<ServiceRow>({
    text: `
      INSERT INTO services (
        name, category, description, price_to_client,
        extra_fee, extra_fee_description, is_band, is_dj_only, requires_meal, is_active, airtable_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING ${COLS};
    `,
    values: [
      input.name,
      input.category ?? null,
      input.description ?? null,
      input.priceToClient ?? null,
      input.extraFee ?? null,
      input.extraFeeDescription ?? null,
      input.isBand,
      input.isDjOnly,
      input.requiresMeal,
      input.isActive,
      input.airtableId ?? null,
    ],
  });

  return rows[0];
}

export async function readServices(): Promise<ServiceRow[]> {
  return run_query<ServiceRow>({
    text: `SELECT ${COLS} FROM services ORDER BY name;`,
  });
}

export async function readServiceById(id: number): Promise<ServiceRow | null> {
  const rows = await run_query<ServiceRow>({
    text: `SELECT ${COLS} FROM services WHERE id = $1 LIMIT 1;`,
    values: [id],
  });

  return rows[0] ?? null;
}

export async function updateService(id: number, input: ServiceMutationInput): Promise<ServiceRow | null> {
  const rows = await run_query<ServiceRow>({
    text: `
      UPDATE services
      SET name = $2,
          category = $3,
          description = $4,
          price_to_client = $5,
          extra_fee = $6,
          extra_fee_description = $7,
          is_band = $8,
          is_dj_only = $9,
          requires_meal = $10,
          is_active = $11,
          airtable_id = $12
      WHERE id = $1
      RETURNING ${COLS};
    `,
    values: [
      id,
      input.name,
      input.category ?? null,
      input.description ?? null,
      input.priceToClient ?? null,
      input.extraFee ?? null,
      input.extraFeeDescription ?? null,
      input.isBand,
      input.isDjOnly,
      input.requiresMeal,
      input.isActive,
      input.airtableId ?? null,
    ],
  });

  return rows[0] ?? null;
}

export async function deleteService(id: number): Promise<boolean> {
  const rows = await run_query<{ id: number }>({
    text: `DELETE FROM services WHERE id = $1 RETURNING id;`,
    values: [id],
  });

  return rows.length > 0;
}

export default { createService, readServices, readServiceById, updateService, deleteService };
