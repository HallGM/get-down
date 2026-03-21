import { run_query } from "../db/init.js";
import type { Service } from "@get-down/shared";

interface ServiceRow {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  price_to_client: number | null;
  fee_per_person: number | null;
  number_of_people: number | null;
  extra_fee: number | null;
  extra_fee_description: string | null;
  is_band: boolean;
  is_dj: boolean;
  is_active: boolean;
  airtable_id: string | null;
}

export interface ServiceMutationInput {
  name: string;
  category?: string;
  description?: string;
  priceToClient?: number;
  feePerPerson?: number;
  numberOfPeople?: number;
  extraFee?: number;
  extraFeeDescription?: string;
  isBand: boolean;
  isDj: boolean;
  isActive: boolean;
  airtableId?: string;
}

export async function createService(input: ServiceMutationInput): Promise<ServiceRow> {
  const rows = await run_query<ServiceRow>({
    text: `
      INSERT INTO services (
        name, category, description, price_to_client, fee_per_person, number_of_people,
        extra_fee, extra_fee_description, is_band, is_dj, is_active, airtable_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, name, category, description, price_to_client, fee_per_person,
                number_of_people, extra_fee, extra_fee_description, is_band, is_dj, is_active, airtable_id;
    `,
    values: [
      input.name,
      input.category ?? null,
      input.description ?? null,
      input.priceToClient ?? null,
      input.feePerPerson ?? null,
      input.numberOfPeople ?? null,
      input.extraFee ?? null,
      input.extraFeeDescription ?? null,
      input.isBand,
      input.isDj,
      input.isActive,
      input.airtableId ?? null,
    ],
  });

  return rows[0];
}

export async function readServices(): Promise<ServiceRow[]> {
  return run_query<ServiceRow>({
    text: `
      SELECT id, name, category, description, price_to_client, fee_per_person,
             number_of_people, extra_fee, extra_fee_description, is_band, is_dj, is_active, airtable_id
      FROM services
      ORDER BY name;
    `,
  });
}

export async function readServiceById(id: number): Promise<ServiceRow | null> {
  const rows = await run_query<ServiceRow>({
    text: `
      SELECT id, name, category, description, price_to_client, fee_per_person,
             number_of_people, extra_fee, extra_fee_description, is_band, is_dj, is_active, airtable_id
      FROM services
      WHERE id = $1
      LIMIT 1;
    `,
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
          fee_per_person = $6,
          number_of_people = $7,
          extra_fee = $8,
          extra_fee_description = $9,
          is_band = $10,
          is_dj = $11,
          is_active = $12,
          airtable_id = $13
      WHERE id = $1
      RETURNING id, name, category, description, price_to_client, fee_per_person,
                number_of_people, extra_fee, extra_fee_description, is_band, is_dj, is_active, airtable_id;
    `,
    values: [
      id,
      input.name,
      input.category ?? null,
      input.description ?? null,
      input.priceToClient ?? null,
      input.feePerPerson ?? null,
      input.numberOfPeople ?? null,
      input.extraFee ?? null,
      input.extraFeeDescription ?? null,
      input.isBand,
      input.isDj,
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
