import type { Pool } from "pg";
import { startDatabase, stopDatabase, resetDatabase, type IntegrationDb } from "./setup.js";

let db: IntegrationDb;
let pool: Pool;

beforeAll(async () => {
  db = await startDatabase();
  pool = db.pool;
}, 120000);

afterAll(async () => {
  await stopDatabase();
});

beforeEach(async () => {
  await resetDatabase(pool);
});

describe("service groups migration", () => {
  test("creates the fixed catalogue and backfills band classifications", async () => {
    const groups = await pool.query<{ name: string }>(
      "SELECT name FROM service_groups ORDER BY id",
    );
    expect(groups.rows.map((row) => row.name)).toEqual([
      "Ceremony music",
      "Evening entertainment",
      "Bagpipes",
      "Videography",
      "Getting ready",
      "Band",
      "DJ only",
      "Requires meal",
    ]);

    await pool.query("INSERT INTO services (name) VALUES ('Integration band')");
    await pool.query(`
      INSERT INTO service_service_groups (service_id, group_id)
      SELECT s.id, g.id
      FROM services s CROSS JOIN service_groups g
      WHERE s.name = 'Integration band' AND g.name = 'Band'
    `);

    const service = await pool.query<{ group_name: string }>(`
      SELECT sg.name AS group_name
      FROM service_service_groups ssg
      JOIN services s ON s.id = ssg.service_id
      JOIN service_groups sg ON sg.id = ssg.group_id
      WHERE s.name = 'Integration band'
    `);
    expect(service.rows.map((row) => row.group_name)).toEqual(["Band"]);
  });

  test("removes legacy service flag columns after backfill", async () => {
    const columns = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'services'
        AND column_name IN ('is_band', 'is_dj_only', 'requires_meal')
    `);
    expect(columns.rows).toHaveLength(0);
  });
});
