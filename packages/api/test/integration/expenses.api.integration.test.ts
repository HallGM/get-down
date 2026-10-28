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

describe("expense payment shares API", () => {
  async function createExpense(
    description: string,
    isTaxOnly = false,
    fields: { amount?: number; date?: string; recipientName?: string } = {},
  ) {
    const response = await auth(request(app).post("/expenses").send({ amount: 10000, description, isTaxOnly, ...fields }));
    expect(response.status).toBe(201);
    return response.body as { id: number };
  }

  test("eligible expense choices exclude tax-only and exact-paid expenses and are ordered with identifying details", async () => {
    const undatedUnpaid = await createExpense("Undated unpaid", false, { recipientName: "No date recipient" });
    const undatedPartial = await createExpense("Undated partial");
    const old = await createExpense("Old dated", false, { amount: 10000, date: "2024-02-10", recipientName: "Old recipient" });
    const newest = await createExpense("Newest dated", false, { amount: 10000, date: "2026-04-15", recipientName: "Newest recipient" });
    const exactPaid = await createExpense("Exactly paid", false, { amount: 10000, date: "2026-03-01", recipientName: "Paid recipient" });
    const overpaid = await createExpense("Overpaid", false, { amount: 10000, date: "2025-01-01" });
    const taxOnly = await createExpense("Tax only", true, { date: "2026-06-01" });

    const account = await pool.query<{ id: number }>("SELECT id FROM accounts WHERE is_business = true");
    const response = await auth(request(app).post("/expense-payments").send({
      accountId: account.rows[0].id,
      amount: 38000,
      shares: [
        { expenseId: undatedPartial.id, amount: 2000 },
        { expenseId: old.id, amount: 10000 },
        { expenseId: newest.id, amount: 1000 },
        { expenseId: exactPaid.id, amount: 10000 },
        { expenseId: overpaid.id, amount: 12000 },
      ],
    }));
    expect(response.status).toBe(201);
    await pool.query(
      "INSERT INTO expense_payment_shares (payment_id, expense_id, amount) VALUES ($1, $2, $3)",
      [response.body.id, taxOnly.id, 1000],
    );

    const eligible = await auth(request(app).get("/expense-payment-expenses"));
    expect(eligible.status).toBe(200);
    expect(eligible.body.map((expense: { id: number }) => expense.id)).toEqual([
      undatedPartial.id,
      undatedUnpaid.id,
      newest.id,
      overpaid.id,
      old.id,
    ]);
    expect(eligible.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: undatedUnpaid.id, recipientName: "No date recipient", description: "Undated unpaid", amount: 10000 }),
      expect.objectContaining({ id: old.id, date: "2024-02-10", recipientName: "Old recipient", description: "Old dated", amount: 10000 }),
      expect.objectContaining({ id: newest.id, date: "2026-04-15", recipientName: "Newest recipient", description: "Newest dated", amount: 10000 }),
    ]));
    expect(eligible.body.find((expense: { id: number }) => expense.id === undatedUnpaid.id)).not.toHaveProperty("date");
    expect(eligible.body.map((expense: { id: number }) => expense.id)).not.toContain(exactPaid.id);
    expect(eligible.body.map((expense: { id: number }) => expense.id)).not.toContain(taxOnly.id);

    const share = response.body.shares.find((item: { expenseId: number }) => item.expenseId === exactPaid.id);
    expect(share).toMatchObject({
      expenseId: exactPaid.id,
      expenseDate: "2026-03-01",
      expenseRecipientName: "Paid recipient",
      expenseAmount: 10000,
      expenseDescription: "Exactly paid",
    });
  });

  test("creates a payment with signed multi-expense shares and keeps one summary", async () => {
    const first = await createExpense("First shared expense");
    const second = await createExpense("Second shared expense");
    const account = await pool.query<{ id: number }>("SELECT id FROM accounts WHERE is_business = true");
    const response = await auth(request(app).post("/expense-payments").send({
      accountId: account.rows[0].id, amount: -9000,
      shares: [{ expenseId: first.id, amount: -2500 }, { expenseId: second.id, amount: -3000 }],
    }));
    expect(response.status).toBe(201);
    expect(response.body.shares).toHaveLength(2);
    expect(response.body.shares).toEqual(expect.arrayContaining([
      expect.objectContaining({
        expenseId: first.id,
        expenseDate: undefined,
        expenseRecipientName: undefined,
        expenseAmount: 10000,
      }),
    ]));

    const summaries = await auth(request(app).get("/expense-payments"));
    expect(summaries.body).toHaveLength(1);
    expect(summaries.body[0]).toMatchObject({ amount: -9000, assignedTotal: -5500, mismatch: -3500 });
    expect(summaries.body[0].shares.map((share: { expenseId: number }) => share.expenseId)).toEqual([first.id, second.id]);
    const expense = await auth(request(app).get(`/expenses/${first.id}`));
    expect(expense.status).toBe(200);
    expect(expense.body.totalPaid).toBe(-2500);
  });

  test("rejects nonexistent and tax-only share targets", async () => {
    const taxOnly = await createExpense("Tax only target", true);
    const account = await pool.query<{ id: number }>("SELECT id FROM accounts WHERE is_business = true");
    for (const expenseId of [taxOnly.id, 999999]) {
      const response = await auth(request(app).post("/expense-payments").send({
        accountId: account.rows[0].id, amount: 1000, shares: [{ expenseId, amount: 1000 }],
      }));
      expect(response.status).toBe(400);
    }
  });

  test("rejects duplicate expense IDs when creating or updating shares", async () => {
    const expense = await createExpense("Duplicate share target");
    const account = await pool.query<{ id: number }>("SELECT id FROM accounts WHERE is_business = true");
    const duplicateShares = [
      { expenseId: expense.id, amount: 1000 },
      { expenseId: expense.id, amount: 2000 },
    ];

    const created = await auth(request(app).post("/expense-payments").send({
      accountId: account.rows[0].id,
      amount: 3000,
      shares: duplicateShares,
    }));
    expect(created.status).toBe(400);

    const payment = await auth(request(app).post("/expense-payments").send({
      accountId: account.rows[0].id,
      amount: 1000,
      shares: [{ expenseId: expense.id, amount: 1000 }],
    }));
    expect(payment.status).toBe(201);

    const updated = await auth(request(app).put(`/expense-payments/${payment.body.id}/shares`).send({
      shares: duplicateShares,
    }));
    expect(updated.status).toBe(400);
  });

  test("payment detail edits preserve shares; share changes are independent; deletion cascades", async () => {
    const first = await createExpense("Before edit");
    const second = await createExpense("After edit");
    const account = await pool.query<{ id: number }>("SELECT id FROM accounts WHERE is_business = true");
    const created = await auth(request(app).post("/expense-payments").send({
      accountId: account.rows[0].id, amount: 8000, shares: [{ expenseId: first.id, amount: 3000 }],
    }));
    const paymentId = created.body.id as number;
    const updated = await auth(request(app).put(`/expense-payments/${paymentId}`).send({ amount: 9000 }));
    expect(updated.body.shares).toEqual(created.body.shares);
    const moved = await auth(request(app).put(`/expense-payments/${paymentId}/shares`).send({ shares: [{ expenseId: first.id, amount: 3000 }, { expenseId: second.id, amount: -12000 }] }));
    expect(moved.body.amount).toBe(9000);
    expect(moved.body.shares).toEqual(expect.arrayContaining([
      expect.objectContaining({ expenseId: first.id, amount: 3000, expenseAmount: 10000 }),
      expect.objectContaining({ expenseId: second.id, amount: -12000 }),
    ]));
    await auth(request(app).delete(`/expenses/${first.id}`));
    expect((await pool.query("SELECT id FROM expense_payments WHERE id = $1", [paymentId])).rows).toHaveLength(1);
    expect((await pool.query("SELECT expense_id, amount FROM expense_payment_shares WHERE payment_id = $1", [paymentId])).rows)
      .toEqual([{ expense_id: second.id, amount: -12000 }]);
    const deleted = await auth(request(app).delete(`/expense-payments/${paymentId}`));
    expect(deleted.status).toBe(204);
    expect((await pool.query("SELECT payment_id FROM expense_payment_shares WHERE payment_id = $1", [paymentId])).rows).toHaveLength(0);
  });
});
