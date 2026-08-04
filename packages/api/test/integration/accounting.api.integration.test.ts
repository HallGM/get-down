/**
 * End-to-end API tests for the Accounting summary endpoint, driven entirely
 * through HTTP via supertest against the real Express app, backed by a real
 * Postgres container. Exercises the full money trail: creating a gig, adding
 * line items, recording a payment, creating a fee allocation with a linked
 * expense, then checking the Accounting page response — the same request
 * path a user's browser takes, including authentication.
 */
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

describe("GET /accounting/summary (end-to-end)", () => {
  test("rejects requests with no auth token", async () => {
    const res = await request(app).get("/accounting/summary");
    expect(res.status).toBe(401);
  });

  test("returns zeroed figures when there is no data", async () => {
    const res = await auth(request(app).get("/accounting/summary"));
    expect(res.status).toBe(200);
    expect(res.body.gigsBooked).toBe(0);
    expect(res.body.businessProfit).toBe(0);
    expect(res.body.feeAllocationsBreakdown).toEqual([]);
  });

  test("a full money trail through the API produces the expected Accounting summary", async () => {
    // Create a person (contractor) via the API.
    const personRes = await auth(request(app).post("/people").send({
      firstName: "Jamie",
      lastName: "Session",
      isPartner: false,
    }));
    expect(personRes.status).toBe(201);
    const personId = personRes.body.id;

    // Create a gig via the API.
    const gigRes = await auth(request(app).post("/gigs").send({
      firstName: "Alex",
      lastName: "Client",
      date: "2025-07-01",
      status: "confirmed",
    }));
    expect(gigRes.status).toBe(201);
    const gigId = gigRes.body.id;

    // Add a billing line item.
    const lineItemRes = await auth(request(app).post(`/gigs/${gigId}/line-items`).send({
      description: "Live band",
      amount: 60000,
    }));
    expect(lineItemRes.status).toBe(201);

    // Record full payment.
    const paymentRes = await auth(request(app).post("/payments").send({
      gigId,
      amount: 60000,
      date: "2025-07-01",
    }));
    expect(paymentRes.status).toBe(201);

    // Create a fee allocation for the contractor.
    const allocationRes = await auth(request(app).post("/fee-allocations").send({
      gigId,
      personId,
    }));
    expect(allocationRes.status).toBe(201);
    const allocationId = allocationRes.body.id;

    await auth(request(app).post(`/fee-allocations/${allocationId}/line-items`).send({
      description: "Performance fee",
      amount: 25000,
    }));

    // Assign the role, linked to the allocation.
    await auth(request(app).post("/assigned-roles").send({
      gigId,
      personId,
      roleName: "Vocals",
      feeAllocationId: allocationId,
    }));

    // Create an expense and link it to the allocation, proving the contractor was paid.
    // A date is required: the Accounting summary defaults to "all time from the
    // partnership start date", which filters out expenses with no date at all.
    const expenseRes = await auth(request(app).post("/expenses").send({
      amount: 25000,
      description: "Jamie's fee",
      date: "2025-07-01",
    }));
    expect(expenseRes.status).toBe(201);
    const expenseId = expenseRes.body.id;
    await auth(request(app).post(`/fee-allocations/${allocationId}/expenses`).send({ expenseId }));

    // The gig should now be fully settled.
    const gigDetailRes = await auth(request(app).get(`/gigs/${gigId}`));
    expect(gigDetailRes.body.settled).toBe(true);

    const summaryRes = await auth(request(app).get("/accounting/summary"));
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.gigsBooked).toBe(1);
    expect(summaryRes.body.settledNetReceived).toBe(60000);
    expect(summaryRes.body.expensesBreakdown.feeAllocation).toBe(25000);
    expect(summaryRes.body.expenses).toBe(25000);
    expect(summaryRes.body.businessProfit).toBe(35000); // 60000 - 25000
    expect(summaryRes.body.feeAllocationsTotal).toBe(0); // contractor, not a partner
    expect(summaryRes.body.confirmedSharedProfit).toBe(35000);
  });
});
