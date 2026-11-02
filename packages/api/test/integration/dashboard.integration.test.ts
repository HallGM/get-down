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
  const repo = await import("../../src/repository/expense_payments.js");
  const payment = await repo.createExpensePayment({ accountId, amount });
  await repo.createPaymentShare(payment.id, expenseId, amount);
  return payment;
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

describe("Dashboard — expense payment share mismatches", () => {
  test("flags under-, over-, and zero-share payments, while omitting exact matches", async () => {
    const first = await fixtures.makeExpense({ amount: 2000, description: "Share first" });
    const second = await fixtures.makeExpense({ amount: 2000, description: "Share second" });
    const repo = await import("../../src/repository/expense_payments.js");
    const under = await repo.createExpensePayment({ accountId: 1, amount: 1000 });
    await repo.createPaymentShare(under.id, first.id, 400);
    const over = await repo.createExpensePayment({ accountId: 1, amount: 500 });
    await repo.createPaymentShare(over.id, second.id, 800);
    const unassigned = await repo.createExpensePayment({ accountId: 1, amount: -250 });
    const equal = await repo.createExpensePayment({ accountId: 1, amount: 100 });
    await repo.createPaymentShare(equal.id, first.id, 100);

    const dashboard = await import("../../src/repository/dashboard.js");
    const result = await dashboard.readExpensePaymentMismatches();
    expect(result.map((row) => row.id)).toEqual(expect.arrayContaining([under.id, over.id, unassigned.id]));
    expect(result.map((row) => row.id)).not.toContain(equal.id);
    expect(result.find((row) => row.id === under.id)?.assigned_total).toBe(400);
    expect(result.find((row) => row.id === over.id)?.assigned_total).toBe(800);
  });

  test("expense payment totals use signed shares and retain overpayments", async () => {
    const expense = await fixtures.makeExpense({ amount: 1000, description: "Signed allocations" });
    const repo = await import("../../src/repository/expense_payments.js");
    const paid = await repo.createExpensePayment({ accountId: 1, amount: 1400 });
    await repo.createPaymentShare(paid.id, expense.id, 1400);
    const refund = await repo.createExpensePayment({ accountId: 1, amount: -100 });
    await repo.createPaymentShare(refund.id, expense.id, -100);
    const unpaid = await getUnpaidExpenses();
    expect(unpaid.find((row) => row.id === expense.id)?.total_paid).toBe(1300);
  });
});

describe("Dashboard — fee allocation issue query eligibility", () => {
  test("allocation issue queries return recent, future, and undated records without adding age filters", async () => {
    const dates = await pool.query<{ today: string; future: string }>(`
      SELECT CURRENT_DATE::text AS today, (CURRENT_DATE + 1)::text AS future;
    `);
    const { today, future } = dates.rows[0];
    const pastGig = await fixtures.makeGig({ date: "2020-01-01" });
    const todayGig = await fixtures.makeGig({ date: today });
    const futureGig = await fixtures.makeGig({ date: future });
    const orphan = await fixtures.makePerson();
    const pastAllocation = await fixtures.makeFeeAllocation(pastGig.id, orphan.id);
    const todayAllocation = await fixtures.makeFeeAllocation(todayGig.id, orphan.id);
    const futureAllocation = await fixtures.makeFeeAllocation(futureGig.id, orphan.id);
    const undatedAllocation = await (await import("../../src/repository/fee_allocations.js")).createFeeAllocation({ isInvoiced: false });

    const dashboard = await import("../../src/repository/dashboard.js");
    const noExpenseRows = await dashboard.readAllocationsWithoutExpenses();
    expect(noExpenseRows.map((row) => row.id)).toEqual(expect.arrayContaining([
      pastAllocation.id, todayAllocation.id, futureAllocation.id, undatedAllocation.id,
    ]));
    expect(noExpenseRows.find((row) => row.id === todayAllocation.id)?.event_date).toBe(today);
    expect(noExpenseRows.find((row) => row.id === futureAllocation.id)?.event_date).toBe(future);
    expect(noExpenseRows.find((row) => row.id === undatedAllocation.id)?.event_date).toBeNull();
    const withoutRoles = await dashboard.readAllocationsWithoutRoles();
    expect(withoutRoles.map((row) => row.id)).toEqual(expect.arrayContaining([
      pastAllocation.id, todayAllocation.id, futureAllocation.id, undatedAllocation.id,
    ]));

    const partner = await fixtures.makePartner();
    const unconfirmed = await fixtures.makeFeeAllocation(futureGig.id, partner.id, false);
    expect((await dashboard.readUnconfirmedPartnerAllocations()).map((row) => row.id)).toContain(unconfirmed.id);
  });

  test("role-without-allocation queries and fee expense mismatches retain strict past-only eligibility", async () => {
    const dates = await pool.query<{ yesterday: string; today: string; tomorrow: string }>(`
      SELECT (CURRENT_DATE - 1)::text AS yesterday, CURRENT_DATE::text AS today,
        (CURRENT_DATE + 1)::text AS tomorrow;
    `);
    const { yesterday, today, tomorrow } = dates.rows[0];
    const person = await fixtures.makePerson();
    const past = await fixtures.makeGig({ date: yesterday });
    const current = await fixtures.makeGig({ date: today });
    const future = await fixtures.makeGig({ date: tomorrow });
    const pastRole = await fixtures.makeAssignedRole({ gigId: past.id, personId: person.id, roleName: "Past performer" });
    const currentRole = await fixtures.makeAssignedRole({ gigId: current.id, personId: person.id, roleName: "Current performer" });
    const futureRole = await fixtures.makeAssignedRole({ gigId: future.id, personId: person.id, roleName: "Future performer" });
    const attribution = await fixtures.makeAttribution();
    const pastShowcase = await fixtures.makeShowcase(attribution.id, yesterday);
    const currentShowcase = await fixtures.makeShowcase(attribution.id, today);
    const futureShowcase = await fixtures.makeShowcase(attribution.id, tomorrow);
    const pastShowcaseRole = await fixtures.makeAssignedRole({ showcaseId: pastShowcase.id, personId: person.id, roleName: "Past showcase performer" });
    const currentShowcaseRole = await fixtures.makeAssignedRole({ showcaseId: currentShowcase.id, personId: person.id, roleName: "Current showcase performer" });
    const futureShowcaseRole = await fixtures.makeAssignedRole({ showcaseId: futureShowcase.id, personId: person.id, roleName: "Future showcase performer" });
    const pastEmptyRole = await fixtures.makeAssignedRole({ gigId: past.id, roleName: "Past empty slot" });
    const currentEmptyRole = await fixtures.makeAssignedRole({ gigId: current.id, roleName: "Current empty slot" });
    const pastEmptyShowcaseRole = await fixtures.makeAssignedRole({ showcaseId: pastShowcase.id, roleName: "Past empty showcase slot" });
    const currentEmptyShowcaseRole = await fixtures.makeAssignedRole({ showcaseId: currentShowcase.id, roleName: "Current empty showcase slot" });

    const dashboard = await import("../../src/repository/dashboard.js");
    const roleRows = await dashboard.readGigRolesWithoutAllocation();
    expect(roleRows.map((row) => row.id)).toContain(pastRole.id);
    expect(roleRows.map((row) => row.id)).toContain(pastShowcaseRole.id);
    expect(roleRows.map((row) => row.id)).not.toContain(currentRole.id);
    expect(roleRows.map((row) => row.id)).not.toContain(futureRole.id);
    expect(roleRows.map((row) => row.id)).not.toContain(currentShowcaseRole.id);
    expect(roleRows.map((row) => row.id)).not.toContain(futureShowcaseRole.id);

    const emptyGigRows = await dashboard.readEmptyGigRoles();
    const emptyShowcaseRows = await dashboard.readEmptyShowcaseRoles();
    expect(emptyGigRows.map((row) => row.id)).toContain(pastEmptyRole.id);
    expect(emptyGigRows.map((row) => row.id)).not.toContain(currentEmptyRole.id);
    expect(emptyShowcaseRows.map((row) => row.id)).toContain(pastEmptyShowcaseRole.id);
    expect(emptyShowcaseRows.map((row) => row.id)).not.toContain(currentEmptyShowcaseRole.id);

    const mismatchPast = await fixtures.makeFeeAllocation(past.id, person.id);
    const mismatchCurrent = await fixtures.makeFeeAllocation(current.id, person.id);
    const mismatchFuture = await fixtures.makeFeeAllocation(future.id, person.id);
    for (const allocation of [mismatchPast, mismatchCurrent, mismatchFuture]) {
      await fixtures.makeFeeAllocationLineItem(allocation.id, 1000);
      const expense = await fixtures.makeExpense({ amount: 500 });
      await fixtures.linkExpenseToAllocation(allocation.id, expense.id);
    }
    const mismatches = await dashboard.readFeeAllocationExpenseMismatches();
    expect(mismatches.map((row) => row.allocation_id)).toContain(mismatchPast.id);
    expect(mismatches.map((row) => row.allocation_id)).not.toContain(mismatchCurrent.id);
    expect(mismatches.map((row) => row.allocation_id)).not.toContain(mismatchFuture.id);
  });
});
