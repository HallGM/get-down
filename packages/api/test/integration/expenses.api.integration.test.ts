import type { Pool } from "pg";
import type { Express } from "express";
import { startDatabase, stopDatabase, resetDatabase, type IntegrationDb } from "./setup.js";

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
  if (!token) throw new Error(`Failed to log in: ${JSON.stringify(loginRes.body)}`);
}, 120000);

afterAll(async () => stopDatabase());
beforeEach(async () => resetDatabase(pool));

function auth(req: import("supertest").Test) {
  return req.set("Authorization", `Bearer ${token}`);
}

describe("GET /expenses (end-to-end)", () => {
  test("requires authentication", async () => {
    const response = await request(app).get("/expenses");
    expect(response.status).toBe(401);
  });

  test.each(["2925-01-02", "275760-01-02"])("includes future expense dated %s", async (date) => {
    const createResponse = await auth(request(app).post("/expenses").send({
      amount: 1250,
      description: `Future expense ${date}`,
      date,
    }));
    expect(createResponse.status).toBe(201);

    const listResponse = await auth(request(app).get("/expenses"));
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: createResponse.body.id,
        date,
        description: `Future expense ${date}`,
      }),
    ]));
  });
});
