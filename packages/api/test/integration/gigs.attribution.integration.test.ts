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

describe("gig attribution API", () => {
  test("creates gigs with or without attribution and supports changing, clearing, and partial updates", async () => {
    const regularAttribution = await auth(request(app).post("/attributions").send({
      name: "Agency booking",
      type: "agency",
    }));
    expect(regularAttribution.status).toBe(201);

    const showcaseAttribution = await auth(request(app).post("/attributions").send({
      name: "Summer showcase",
      type: "showcase",
    }));
    expect(showcaseAttribution.status).toBe(201);

    const linkedGig = await auth(request(app).post("/gigs").send({
      firstName: "Linked",
      lastName: "Client",
      date: "2025-07-01",
      attributionId: regularAttribution.body.id,
    }));
    expect(linkedGig.status).toBe(201);
    expect(linkedGig.body.attributionId).toBe(regularAttribution.body.id);

    const unlinkedGig = await auth(request(app).post("/gigs").send({
      firstName: "Unlinked",
      lastName: "Client",
      date: "2025-07-02",
    }));
    expect(unlinkedGig.status).toBe(201);
    expect(unlinkedGig.body).not.toHaveProperty("attributionId");

    const changed = await auth(request(app).put(`/gigs/${linkedGig.body.id}`).send({
      attributionId: showcaseAttribution.body.id,
    }));
    expect(changed.status).toBe(200);
    expect(changed.body.attributionId).toBe(showcaseAttribution.body.id);

    const preserved = await auth(request(app).put(`/gigs/${linkedGig.body.id}`).send({
      description: "Preserve attribution on partial update",
    }));
    expect(preserved.status).toBe(200);
    expect(preserved.body.attributionId).toBe(showcaseAttribution.body.id);

    const cleared = await auth(request(app).put(`/gigs/${linkedGig.body.id}`).send({
      attributionId: null,
    }));
    expect(cleared.status).toBe(200);
    expect(cleared.body).not.toHaveProperty("attributionId");
  });

  test("rejects nonexistent attribution IDs on create and update", async () => {
    const invalidCreate = await auth(request(app).post("/gigs").send({
      firstName: "Invalid",
      lastName: "Create",
      date: "2025-07-01",
      attributionId: 999999,
    }));
    expect(invalidCreate.status).toBe(404);

    const gig = await auth(request(app).post("/gigs").send({
      firstName: "Valid",
      lastName: "Gig",
      date: "2025-07-02",
    }));
    expect(gig.status).toBe(201);

    const invalidUpdate = await auth(request(app).put(`/gigs/${gig.body.id}`).send({
      attributionId: 999999,
    }));
    expect(invalidUpdate.status).toBe(404);
  });

  test("attributing a settled booking to a showcase includes it in the showcase list and financial summary", async () => {
    const showcaseRes = await auth(request(app).post("/showcases").send({
      nickname: "Summer Showcase",
      date: "2025-05-01",
    }));
    expect(showcaseRes.status).toBe(201);

    const partner = await fixtures.makePartner();
    const { gig } = await fixtures.makeSettledGig({
      billingAmount: 50000,
      feeAmount: 10000,
      personId: partner.id,
      isPartner: true,
      date: "2025-06-01",
    });

    const assignment = await auth(request(app).put(`/gigs/${gig.id}`).send({
      attributionId: showcaseRes.body.attributionId,
    }));
    expect(assignment.status).toBe(200);
    expect(assignment.body.attributionId).toBe(showcaseRes.body.attributionId);

    const gigList = await auth(request(app).get(`/showcases/${showcaseRes.body.id}/gigs`));
    expect(gigList.status).toBe(200);
    expect(gigList.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: gig.id, firstName: gig.first_name, status: "confirmed" }),
    ]));

    const summary = await auth(request(app).get(`/showcases/${showcaseRes.body.id}`));
    expect(summary.status).toBe(200);
    expect(summary.body.linkedGigCount).toBe(1);
    expect(summary.body.incomeFromGigs).toBe(40000);
    expect(summary.body.netProfit).toBe(40000);
  });
});
