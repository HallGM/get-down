import { run_query } from "../db/init.js";

export interface ServiceRow {
  id: number;
  name: string;
  description: string | null;
  price_to_client: number | null;
  extra_fee: number | null;
  extra_fee_description: string | null;
  is_band: boolean;
  is_dj_only: boolean;
  requires_meal: boolean;
  airtable_id: string | null;
  number_of_people: number;
  profit_margin: number | null;
  times_used: number;
}

export interface ServiceMutationInput {
  name: string;
  description?: string;
  priceToClient?: number;
  extraFee?: number;
  extraFeeDescription?: string;
  isBand: boolean;
  isDjOnly: boolean;
  requiresMeal: boolean;
  airtableId?: string;
}

const COLS = `
  id, name, description, price_to_client,
  extra_fee, extra_fee_description, is_band, is_dj_only, requires_meal, airtable_id,
  (SELECT COUNT(*) FROM role_services rs WHERE rs.service_id = services.id)::int AS number_of_people,
  CASE
    WHEN price_to_client IS NULL THEN NULL
    ELSE price_to_client - COALESCE(
      (SELECT SUM(r.fee) FROM role_services rs2 JOIN roles r ON r.id = rs2.role_id WHERE rs2.service_id = services.id),
      0
    )
  END AS profit_margin,
  (SELECT COUNT(*) FROM gig_services gs2 JOIN gigs g2 ON g2.id = gs2.gig_id WHERE gs2.service_id = services.id AND g2.status != 'cancelled')::int AS times_used
`;

export async function createService(input: ServiceMutationInput): Promise<ServiceRow> {
  const rows = await run_query<ServiceRow>({
    text: `
      INSERT INTO services (
        name, description, price_to_client,
        extra_fee, extra_fee_description, is_band, is_dj_only, requires_meal, airtable_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${COLS};
    `,
    values: [
      input.name,
      input.description ?? null,
      input.priceToClient ?? null,
      input.extraFee ?? null,
      input.extraFeeDescription ?? null,
      input.isBand,
      input.isDjOnly,
      input.requiresMeal,
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
          description = $3,
          price_to_client = $4,
          extra_fee = $5,
          extra_fee_description = $6,
          is_band = $7,
          is_dj_only = $8,
          requires_meal = $9,
          airtable_id = $10
      WHERE id = $1
      RETURNING ${COLS};
    `,
    values: [
      id,
      input.name,
      input.description ?? null,
      input.priceToClient ?? null,
      input.extraFee ?? null,
      input.extraFeeDescription ?? null,
      input.isBand,
      input.isDjOnly,
      input.requiresMeal,
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
