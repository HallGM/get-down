import { run_query } from "../db/init.js";
import type { Service } from "@get-down/shared";

interface ServiceRow {
  id: number;
  name: string;
}

export async function createService(name: string): Promise<{ id: number }[]> {
  const query = {
    text: `INSERT INTO services (name) VALUES ($1) RETURNING id;`,
    values: [name],
  };
  return run_query<{ id: number }>(query);
}

export async function readServices(): Promise<ServiceRow[]> {
  const query = {
    text: `SELECT id, name FROM services;`,
  };
  return run_query<ServiceRow>(query);
}

export default { createService, readServices };
