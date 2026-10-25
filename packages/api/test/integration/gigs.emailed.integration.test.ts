import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import type { Express } from "express";
import { startDatabase, stopDatabase, resetDatabase, type IntegrationDb } from "./setup.js";

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../migrations");

let db: IntegrationDb;
let pool: Pool;
let app: Express;
let token: string;
let request: typeof import("supertest");

beforeAll(async () => {
  db = await startDatabase();
  pool = db.pool;

  const supertestModule = await import("supertest");
  request = supertestModule.default as unknown as typeof import("supertest");

  const appModule = await import("../../src/app.js");
  app = appModule.default as unknown as Express;

  const loginRes = await request(app)
    .post("/auth/login")
    .send({ email: "admin@get-down.com", password: "password" });
  token = loginRes.body.token;
  if (!token) {
    throw new Error(`Failed to log in as seeded dev user: ${JSON.stringify(loginRes.body)}`);
  }
}, 120000);

afterAll(async () => {
  await stopDatabase();
});

beforeEach(async () => {
  await resetDatabase(pool);
});

function auth(req: import("supertest").Test) {
  return req.set("Authorization", `Bearer ${token}`);
}

describe("gig emailed status API", () => {
  test("migration initializes existing gigs to false", async () => {
    await pool.query("ALTER TABLE gigs DROP COLUMN emailed;");
    await pool.query(`
      INSERT INTO gigs (first_name, last_name, status)
      VALUES ('Existing', 'Enquiry', 'enquiry');
    `);

    const migration = readFileSync(resolve(migrationsDir, "071_gig_emailed_status.sql"), "utf8");
    await pool.query(migration);

    const { rows } = await pool.query<{ emailed: boolean }>("SELECT emailed FROM gigs;");
    expect(rows).toEqual([{ emailed: false }]);
  });

  test("defaults new enquiries and carries emailed through reads and partial updates", async () => {
    const created = await auth(request(app).post("/gigs").send({
      firstName: "New",
      lastName: "Enquiry",
      status: "enquiry",
    }));
    expect(created.status).toBe(201);
    expect(created.body.emailed).toBe(false);

    const list = await auth(request(app).get("/gigs"));
    expect(list.status).toBe(200);
    expect(list.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: created.body.id, emailed: false }),
    ]));

    const detail = await auth(request(app).get(`/gigs/${created.body.id}`));
    expect(detail.status).toBe(200);
    expect(detail.body.emailed).toBe(false);

    const markedEmailed = await auth(request(app).put(`/gigs/${created.body.id}`).send({ emailed: true }));
    expect(markedEmailed.status).toBe(200);
    expect(markedEmailed.body.emailed).toBe(true);

    const unrelatedUpdate = await auth(request(app).put(`/gigs/${created.body.id}`).send({ description: "Follow-up" }));
    expect(unrelatedUpdate.status).toBe(200);
    expect(unrelatedUpdate.body.emailed).toBe(true);

    const statusChange = await auth(request(app).put(`/gigs/${created.body.id}`).send({ status: "confirmed", date: "2025-07-01" }));
    expect(statusChange.status).toBe(200);
    expect(statusChange.body.emailed).toBe(true);

    const unmarked = await auth(request(app).put(`/gigs/${created.body.id}`).send({ emailed: false }));
    expect(unmarked.status).toBe(200);
    expect(unmarked.body.emailed).toBe(false);
  });
});
