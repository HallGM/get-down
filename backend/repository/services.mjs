import { run_query } from "../db/init.mjs";
import { newService } from "../models/services.mjs";

export async function createService(name) {
  const query = `
    INSERT INTO services (name)
    VALUES ($1)
    RETURNING id;`;
  return await run_query({ text: query, values: [name] });
}

export async function readServices() {
  const query = `
  SELECT id, name FROM services;`;
  return await run_query({ text: query });
}

export default { createService, readServices };
