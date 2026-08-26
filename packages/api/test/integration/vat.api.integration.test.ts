import type { Pool } from "pg";
import type { Express } from "express";
import { startDatabase, stopDatabase, resetDatabase, type IntegrationDb } from "./setup.js";
import * as fixtures from "./fixtures.js";

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

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

describe("GET /vat/report (end-to-end)", () => {
  test("requires authentication", async () => {
    const response = await request(app).get("/vat/report?mode=before&date=2026-06-30");
    expect(response.status).toBe(401);
  });

  test("returns a payment in the default end-date rolling period", async () => {
    const today = new Date();
    const paymentDate = isoDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
    const gig = await fixtures.makeGig({ date: "2030-01-01" });
    await fixtures.makePayment(gig.id, 36000, paymentDate);

    const response = await auth(request(app).get(`/vat/report?mode=before&date=${isoDate(today)}`));

    expect(response.status).toBe(200);
    expect(response.body.periodEnd).toBe(isoDate(today));
    expect(response.body.transactions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "payment",
        date: paymentDate,
        amount: 36000,
        effect: 36000,
        clientFirstName: gig.first_name,
        clientLastName: gig.last_name,
      }),
    ]));
    expect(response.body.turnover).toBe(36000);
  });

  test("uses payment and refund dates and excludes write-offs", async () => {
    const gig = await fixtures.makeGig({ date: "2030-01-01" });
    await fixtures.makePayment(gig.id, 10000, "2025-07-01");
    await fixtures.makePayment(gig.id, 20000, "2024-07-01");
    await fixtures.makeRefund(gig.id, 2500, "credit", "2025-08-01");
    await fixtures.makeRefund(gig.id, 1500, "adjustment", "2025-09-01");
    await fixtures.makeRefund(gig.id, 5000, "write_off", "2025-10-01");

    const response = await auth(request(app).get("/vat/report?mode=before&date=2026-06-30"));

    expect(response.status).toBe(200);
    expect(response.body.periodStart).toBe("2025-07-01");
    expect(response.body.periodEnd).toBe("2026-06-30");
    expect(response.body.turnover).toBe(6000);
    expect(response.body.transactions).toHaveLength(3);
    expect(response.body.transactions.map((t: { type: string; refundSubtype?: string }) => t.type === "refund" ? t.refundSubtype : t.type))
      .toEqual(["payment", "credit", "adjustment"]);
  });

  test("reports undated records separately and excludes them", async () => {
    const gig = await fixtures.makeGig();
    const { createPayment } = await import("../../src/repository/payments.js");
    const { createRefund } = await import("../../src/repository/refunds.js");
    await createPayment({ gigId: gig.id, amount: 10000, date: undefined });
    await createRefund({ gigId: gig.id, amount: 1000, subtype: "credit", date: undefined });

    const response = await auth(request(app).get("/vat/report?mode=before&date=2026-06-30"));

    expect(response.status).toBe(200);
    expect(response.body.turnover).toBe(0);
    expect(response.body.transactions).toEqual([]);
    expect(response.body.undatedPayments).toBe(1);
    expect(response.body.undatedRefunds).toBe(1);
  });
});
