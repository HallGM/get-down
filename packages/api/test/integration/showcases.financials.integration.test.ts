import type { Pool } from "pg";
import { startDatabase, stopDatabase, resetDatabase, type IntegrationDb } from "./setup.js";
import * as fixtures from "./fixtures.js";

let db: IntegrationDb;
let pool: Pool;

async function getShowcaseFinancials() {
  const { getShowcaseById } = await import("../../src/services/showcases.js");
  const { updateApportionedAmount } = await import("../../src/repository/showcases.js");
  return { getShowcaseById, updateApportionedAmount };
}

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

describe("showcase financials", () => {
  test("combines direct expenses and direct fee allocations once", async () => {
    const { getShowcaseById, updateApportionedAmount } = await getShowcaseFinancials();
    const attribution = await fixtures.makeAttribution({ name: "Financial showcase" });
    const showcase = await fixtures.makeShowcase(attribution.id);
    const partner = await fixtures.makePartner();
    const gig = await fixtures.makeGig({ attributionId: attribution.id });
    await fixtures.makeLineItem(gig.id, 50000);
    await fixtures.makePayment(gig.id, 50000);
    const gigAllocation = await fixtures.makeFeeAllocation(gig.id, partner.id, true);
    await fixtures.makeFeeAllocationLineItem(gigAllocation.id, 10000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: partner.id, roleName: "Gig performer", feeAllocationId: gigAllocation.id });

    const expense = await fixtures.makeExpense({ amount: 7000 });
    await fixtures.linkExpenseToShowcase(showcase.id, expense.id);
    const apportionedExpense = await fixtures.makeExpense({ amount: 9000 });
    await fixtures.linkExpenseToShowcase(showcase.id, apportionedExpense.id);
    await updateApportionedAmount(showcase.id, apportionedExpense.id, 2000);

    const allocation = await fixtures.makeShowcaseFeeAllocation();
    await fixtures.makeFeeAllocationLineItem(allocation.id, 3000, "First fee");
    await fixtures.makeFeeAllocationLineItem(allocation.id, 1000, "Second fee");
    await fixtures.makeAssignedRole({ showcaseId: showcase.id, roleName: "Vocals", feeAllocationId: allocation.id });
    await fixtures.makeAssignedRole({ showcaseId: showcase.id, roleName: "Backup vocals", feeAllocationId: allocation.id });

    const result = await getShowcaseById(showcase.id);

    expect(result.calculatedCost).toBe(9000);
    expect(result.showcasePerformerFees).toBe(4000);
    expect(result.totalCost).toBe(13000);
    expect(result.incomeFromGigs).toBe(40000);
    expect(result.netProfit).toBe(27000);
  });

  test("includes unassigned direct allocations and excludes gig allocations", async () => {
    const { getShowcaseById } = await getShowcaseFinancials();
    const attribution = await fixtures.makeAttribution({ name: "Scoped showcase" });
    const showcase = await fixtures.makeShowcase(attribution.id);
    const direct = await fixtures.makeShowcaseFeeAllocation();
    await fixtures.makeFeeAllocationLineItem(direct.id, 2500, "Unassigned fee");
    await fixtures.makeAssignedRole({ showcaseId: showcase.id, roleName: "Unassigned role", feeAllocationId: direct.id });

    const gig = await fixtures.makeGig({ attributionId: attribution.id });
    const person = await fixtures.makePerson();
    const gigAllocation = await fixtures.makeFeeAllocation(gig.id, person.id);
    await fixtures.makeFeeAllocationLineItem(gigAllocation.id, 8000, "Gig fee");
    await fixtures.makeAssignedRole({ gigId: gig.id, roleName: "Gig role", feeAllocationId: gigAllocation.id });

    const result = await getShowcaseById(showcase.id);

    expect(result.showcasePerformerFees).toBe(2500);
    expect(result.totalCost).toBe(2500);
  });

  test("returns zero cost when no direct costs exist", async () => {
    const { getShowcaseById } = await getShowcaseFinancials();
    const attribution = await fixtures.makeAttribution({ name: "Empty showcase" });
    const showcase = await fixtures.makeShowcase(attribution.id);
    const result = await getShowcaseById(showcase.id);

    expect(result.calculatedCost).toBe(0);
    expect(result.showcasePerformerFees).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.netProfit).toBe(0);
  });
});
