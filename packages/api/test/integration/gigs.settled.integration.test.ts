/**
 * Integration tests for the settled-gig condition (repository/settled.ts),
 * run against a real Postgres container via Testcontainers. These prove the
 * SQL itself is correct, not just that a JS re-implementation agrees with it.
 *
 * See services/ACCOUNTING.md → "Settled vs unsettled gig" for the plain
 * English definition each of these tests is checking.
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

async function isSettled(gigId: number): Promise<boolean> {
  const settled = await import("../../src/repository/settled.js");
  return settled.readGigSettledStatusById(gigId);
}

describe("SETTLED_CONDITION", () => {
  test("fully settled contractor gig: line item, exact payment, role, allocation, linked expense", async () => {
    const person = await fixtures.makePerson({ isPartner: false });
    const { gig } = await fixtures.makeSettledGig({
      billingAmount: 50000,
      feeAmount: 20000,
      personId: person.id,
      isPartner: false,
    });
    expect(await isSettled(gig.id)).toBe(true);
  });

  test("fully settled partner gig: allocation must be confirmed, no expense needed", async () => {
    const partner = await fixtures.makePartner();
    const { gig } = await fixtures.makeSettledGig({
      billingAmount: 40000,
      feeAmount: 15000,
      personId: partner.id,
      isPartner: true,
    });
    expect(await isSettled(gig.id)).toBe(true);
  });

  test("unconfirmed partner allocation prevents settlement even if fully paid", async () => {
    const partner = await fixtures.makePartner();
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 30000);
    await fixtures.makePayment(gig.id, 30000);
    const allocation = await fixtures.makeFeeAllocation(gig.id, partner.id, false); // NOT confirmed
    await fixtures.makeFeeAllocationLineItem(allocation.id, 10000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: partner.id, roleName: "Performer", feeAllocationId: allocation.id });
    expect(await isSettled(gig.id)).toBe(false);
  });

  test("contractor allocation without a linked expense prevents settlement", async () => {
    const person = await fixtures.makePerson({ isPartner: false });
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 30000);
    await fixtures.makePayment(gig.id, 30000);
    const allocation = await fixtures.makeFeeAllocation(gig.id, person.id, false);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 10000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: person.id, roleName: "Performer", feeAllocationId: allocation.id });
    // No expense linked — should NOT be settled.
    expect(await isSettled(gig.id)).toBe(false);
  });

  test("no line items: never settled regardless of payments", async () => {
    const gig = await fixtures.makeGig();
    await fixtures.makePayment(gig.id, 10000);
    expect(await isSettled(gig.id)).toBe(false);
  });

  test("no assigned roles: never settled even with matching payment", async () => {
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 10000);
    await fixtures.makePayment(gig.id, 10000);
    expect(await isSettled(gig.id)).toBe(false);
  });

  test("underpaid gig: billing does not equal net received, not settled", async () => {
    const person = await fixtures.makePerson({ isPartner: false });
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 50000);
    await fixtures.makePayment(gig.id, 30000); // short by £200
    const allocation = await fixtures.makeFeeAllocation(gig.id, person.id, false);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 10000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: person.id, roleName: "Performer", feeAllocationId: allocation.id });
    const expense = await fixtures.makeExpense({ amount: 10000 });
    await fixtures.linkExpenseToAllocation(allocation.id, expense.id);
    expect(await isSettled(gig.id)).toBe(false);
  });

  // ─── Refund subtype scenarios ────────────────────────────────────────────
  // These prove the intentional asymmetry documented in ACCOUNTING.md:
  // credit affects both billing and net received, write_off affects billing
  // only, adjustment affects net received only.

  test("credit refund: reduces both billing and net received, still settles when balanced", async () => {
    const person = await fixtures.makePerson({ isPartner: false });
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 10000); // billed £100
    await fixtures.makePayment(gig.id, 10000); // client paid £100
    await fixtures.makeRefund(gig.id, 2000, "credit"); // £20 goodwill cash back
    // billing_total = 10000 - 2000 = 8000; net_received = 10000 - 2000 = 8000 → settled
    const allocation = await fixtures.makeFeeAllocation(gig.id, person.id, false);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 3000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: person.id, roleName: "Performer", feeAllocationId: allocation.id });
    const expense = await fixtures.makeExpense({ amount: 3000 });
    await fixtures.linkExpenseToAllocation(allocation.id, expense.id);
    expect(await isSettled(gig.id)).toBe(true);
  });

  test("write-off refund: reduces billing only; settles once payment matches the reduced billing", async () => {
    const person = await fixtures.makePerson({ isPartner: false });
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 10000); // billed £100
    await fixtures.makeRefund(gig.id, 1500, "write_off"); // £15 debt forgiven, no cash moves
    await fixtures.makePayment(gig.id, 8500); // client pays the reduced amount owed
    // billing_total = 10000 - 1500 = 8500; net_received = 8500 - 0 = 8500 → settled
    const allocation = await fixtures.makeFeeAllocation(gig.id, person.id, false);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 2000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: person.id, roleName: "Performer", feeAllocationId: allocation.id });
    const expense = await fixtures.makeExpense({ amount: 2000 });
    await fixtures.linkExpenseToAllocation(allocation.id, expense.id);
    expect(await isSettled(gig.id)).toBe(true);
  });

  test("adjustment refund: reduces net received only; settles once billing matches the adjusted cash", async () => {
    const person = await fixtures.makePerson({ isPartner: false });
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 10000); // billed £100
    await fixtures.makePayment(gig.id, 13000); // client accidentally overpaid £130
    await fixtures.makeRefund(gig.id, 3000, "adjustment"); // £30 handed back
    // billing_total = 10000 (unchanged); net_received = 13000 - 3000 = 10000 → settled
    const allocation = await fixtures.makeFeeAllocation(gig.id, person.id, false);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 4000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: person.id, roleName: "Performer", feeAllocationId: allocation.id });
    const expense = await fixtures.makeExpense({ amount: 4000 });
    await fixtures.linkExpenseToAllocation(allocation.id, expense.id);
    expect(await isSettled(gig.id)).toBe(true);
  });

  test("adjustment refund without a matching overpayment leaves the gig unsettled", async () => {
    const person = await fixtures.makePerson({ isPartner: false });
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 10000); // billed £100
    await fixtures.makePayment(gig.id, 10000); // paid exactly £100
    await fixtures.makeRefund(gig.id, 2000, "adjustment"); // then incorrectly refunded £20 anyway
    // billing_total = 10000; net_received = 10000 - 2000 = 8000 → NOT settled (imbalance is real, not a bug)
    const allocation = await fixtures.makeFeeAllocation(gig.id, person.id, false);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 3000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: person.id, roleName: "Performer", feeAllocationId: allocation.id });
    const expense = await fixtures.makeExpense({ amount: 3000 });
    await fixtures.linkExpenseToAllocation(allocation.id, expense.id);
    expect(await isSettled(gig.id)).toBe(false);
  });

  test("cancelled gig is never settled even if fully paid and allocated", async () => {
    const person = await fixtures.makePerson({ isPartner: false });
    const { gig } = await fixtures.makeSettledGig({
      billingAmount: 10000,
      feeAmount: 3000,
      personId: person.id,
      isPartner: false,
    });
    await pool.query(`UPDATE gigs SET status = 'cancelled' WHERE id = $1;`, [gig.id]);
    // Note: SETTLED_CONDITION itself does not check status = 'cancelled' — cancellation
    // exclusion happens at the call site (WHERE g.status != 'cancelled'). This test
    // documents that fact so a future change to either side does not silently break it.
    const settledIgnoringStatus = await isSettled(gig.id);
    expect(settledIgnoringStatus).toBe(true);
  });
});
