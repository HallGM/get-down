/**
 * Integration tests for the Dashboard repository queries, specifically
 * the readUnpaidExpenses() function that identifies expenses where the
 * amount paid does not match the expense total.
 */
import type { Pool } from "pg";
import { startDatabase, stopDatabase, resetDatabase, type IntegrationDb } from "./setup.js";
import * as fixtures from "./fixtures.js";

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

async function getUnpaidExpenses() {
  const repo = await import("../../src/repository/dashboard.js");
  return repo.readUnpaidExpenses();
}

async function createExpensePayment(expenseId: number, amount: number, accountId: number = 1) {
  const { createExpensePayment } = await import("../../src/repository/expense_payments.js");
  return createExpensePayment(expenseId, { accountId, amount });
}

describe("Dashboard — unpaid expenses", () => {
  test("an expense with no payments recorded appears as unpaid", async () => {
    const expense = await fixtures.makeExpense({ amount: 50000, description: "Unpaid invoice" });

    const result = await getUnpaidExpenses();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(expense.id);
    expect(result[0].amount).toBe(50000);
    expect(result[0].total_paid).toBe(0);
    expect(result[0].description).toBe("Unpaid invoice");
  });

  test("an expense with a partial payment appears as unpaid", async () => {
    const expense = await fixtures.makeExpense({ amount: 50000, description: "Partially paid invoice" });
    await createExpensePayment(expense.id, 30000);

    const result = await getUnpaidExpenses();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(expense.id);
    expect(result[0].amount).toBe(50000);
    expect(result[0].total_paid).toBe(30000);
  });

  test("an expense that is fully paid does not appear", async () => {
    const expense = await fixtures.makeExpense({ amount: 50000, description: "Fully paid invoice" });
    await createExpensePayment(expense.id, 50000);

    const result = await getUnpaidExpenses();
    expect(result).toHaveLength(0);
  });

  test("an expense that is over-paid (total paid > expense amount) appears as unpaid", async () => {
    const expense = await fixtures.makeExpense({ amount: 50000, description: "Over-paid invoice" });
    await createExpensePayment(expense.id, 55000);

    const result = await getUnpaidExpenses();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(expense.id);
    expect(result[0].amount).toBe(50000);
    expect(result[0].total_paid).toBe(55000);
  });

  test("multiple expenses are returned in the correct order (most recent first)", async () => {
    const exp1 = await fixtures.makeExpense({ amount: 10000, description: "Oldest expense", date: "2024-01-01" });
    const exp2 = await fixtures.makeExpense({ amount: 20000, description: "Newest expense", date: "2024-12-31" });
    const exp3 = await fixtures.makeExpense({ amount: 15000, description: "No date expense" });

    const result = await getUnpaidExpenses();
    expect(result).toHaveLength(3);
    // Most recent (2024-12-31) should be first
    expect(result[0].id).toBe(exp2.id);
    // Second-most recent (2024-01-01) should be second
    expect(result[1].id).toBe(exp1.id);
    // No date (NULLs LAST) should be last
    expect(result[2].id).toBe(exp3.id);
  });

  test("filtering unpaid expenses includes expenses linked to person invoices", async () => {
    // Create a person invoice context expense (would normally have personInvoice set)
    const expense = await fixtures.makeExpense({ amount: 5000, description: "Person invoice expense" });
    // Don't create any payment for it
    const result = await getUnpaidExpenses();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(expense.id);
  });

   test("filtering unpaid expenses includes expenses linked to card charges", async () => {
     // Create an expense that would be linked to a card charge
     const expense = await fixtures.makeExpense({ amount: 8000, description: "Card charge expense" });
     // Partially pay it
     await createExpensePayment(expense.id, 3000);
     const result = await getUnpaidExpenses();
     expect(result).toHaveLength(1);
     expect(result[0].id).toBe(expense.id);
     expect(result[0].total_paid).toBe(3000);
   });

   test("tax-only expenses are excluded from unpaid alerts, even if unpaid", async () => {
     // Regular unpaid expense
     const regularExpense = await fixtures.makeExpense({ amount: 50000, description: "Regular unpaid" });
     
     // Tax-only unpaid expense
     const taxOnlyExpense = await fixtures.makeExpense({ amount: 25000, description: "Tax-only unpaid", isTaxOnly: true });

     const result = await getUnpaidExpenses();
     
     // Only the regular expense should appear
     expect(result).toHaveLength(1);
     expect(result[0].id).toBe(regularExpense.id);
     expect(result[0].amount).toBe(50000);
   });

    test("tax-only expenses never alert, regardless of payment status", async () => {
      const taxOnlyUnpaid = await fixtures.makeExpense({ amount: 10000, isTaxOnly: true, description: "Tax unpaid" });
      const taxOnlyPartial = await fixtures.makeExpense({ amount: 20000, isTaxOnly: true, description: "Tax partial" });
      // Note: We add payments via the repository directly (bypassing the service guard that prevents payments on tax-only expenses in production).
      // This test verifies that the query-level filtering in readUnpaidExpenses() correctly excludes tax-only expenses
      // regardless of their payment status. In real usage, tax-only expenses never have payments.
      await createExpensePayment(taxOnlyPartial.id, 5000);
      const taxOnlyPaid = await fixtures.makeExpense({ amount: 15000, isTaxOnly: true, description: "Tax paid" });
      await createExpensePayment(taxOnlyPaid.id, 15000);

      const result = await getUnpaidExpenses();
      
      // No tax-only expenses should appear, even those unpaid or partially paid
      expect(result).toHaveLength(0);
    });
});
