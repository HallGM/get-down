/**
 * Integration tests for the Accounting page repository queries, run against
 * a real Postgres container. Proves the whole-business figures on the
 * Accounting page (repository/accounting.ts) are correct against hand-worked
 * scenarios, and that they stay internally consistent with per-gig confirmed
 * profit — the exact symptom this work was commissioned to investigate.
 *
 * See services/ACCOUNTING.md for the plain-English definition of every
 * figure asserted here.
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

async function getAccounting() {
  const repo = await import("../../src/repository/accounting.js");
  const bounds = { start: null, end: null }; // all-time, unfiltered (partnership-start floor applied by the service layer, not tested here)
  const [gigCounts, expensesBreakdown, partnerAllocations, predictedSummary] = await Promise.all([
    repo.readGigCounts(bounds),
    repo.readExpensesBreakdown(bounds),
    repo.readPartnerFeeAllocations(bounds),
    repo.readPredictedProfitSummary(bounds),
  ]);
  const expenses = expensesBreakdown.feeAllocation + expensesBreakdown.showcase + expensesBreakdown.other;
  const businessProfit = predictedSummary.settledNetReceived - expenses;
  const feeAllocationsTotal = partnerAllocations.reduce((sum, a) => sum + a.amount, 0);
  return { gigCounts, expensesBreakdown, expenses, businessProfit, partnerAllocations, feeAllocationsTotal, predictedSummary };
}

async function confirmedProfitForGig(billingTotal: number, feesTotal: number): Promise<number> {
  const { calcConfirmedProfit } = await import("@get-down/shared");
  return calcConfirmedProfit({ billingTotal, feesTotal });
}

describe("Accounting page figures — settled scenarios", () => {
  test("a single settled, profitable contractor gig contributes its full net received and expense", async () => {
    const contractor = await fixtures.makePerson({ isPartner: false });
    await fixtures.makeSettledGig({ billingAmount: 50000, feeAmount: 20000, personId: contractor.id, isPartner: false });

    const result = await getAccounting();
    expect(result.predictedSummary.settledNetReceived).toBe(50000);
    expect(result.expensesBreakdown.feeAllocation).toBe(20000);
    expect(result.expenses).toBe(20000);
    expect(result.businessProfit).toBe(30000); // 50000 - 20000
  });

  test("a settled loss-making gig (fee allocation exceeds billing) reduces business profit accordingly", async () => {
    const contractor = await fixtures.makePerson({ isPartner: false });
    await fixtures.makeSettledGig({ billingAmount: 10000, feeAmount: 15000, personId: contractor.id, isPartner: false });

    const result = await getAccounting();
    expect(result.businessProfit).toBe(-5000);
  });

  test("a settled partner-only gig: business profit unaffected by the allocation, but shown in feeAllocationsTotal", async () => {
    const partner = await fixtures.makePartner();
    await fixtures.makeSettledGig({ billingAmount: 40000, feeAmount: 15000, personId: partner.id, isPartner: true });

    const result = await getAccounting();
    // No expense is created for a partner allocation, so it never lands in `expenses`.
    expect(result.expenses).toBe(0);
    expect(result.businessProfit).toBe(40000); // full net received, no expense to subtract
    expect(result.feeAllocationsTotal).toBe(15000); // shown separately, not as an expense
  });

  test("a settled gig with both a partner and a contractor allocation: only the contractor's fee is an expense", async () => {
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 60000);
    await fixtures.makePayment(gig.id, 60000);

    const partner = await fixtures.makePartner();
    const partnerAllocation = await fixtures.makeFeeAllocation(gig.id, partner.id, true);
    await fixtures.makeFeeAllocationLineItem(partnerAllocation.id, 20000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: partner.id, roleName: "Vocals", feeAllocationId: partnerAllocation.id });

    const contractor = await fixtures.makePerson({ isPartner: false });
    const contractorAllocation = await fixtures.makeFeeAllocation(gig.id, contractor.id, false);
    await fixtures.makeFeeAllocationLineItem(contractorAllocation.id, 10000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: contractor.id, roleName: "Drums", feeAllocationId: contractorAllocation.id });
    const expense = await fixtures.makeExpense({ amount: 10000 });
    await fixtures.linkExpenseToAllocation(contractorAllocation.id, expense.id);

    const result = await getAccounting();
    expect(result.expenses).toBe(10000); // only the contractor's fee
    expect(result.businessProfit).toBe(50000); // 60000 - 10000
    expect(result.feeAllocationsTotal).toBe(20000); // only the partner's fee
  });

  test("a refund after payment on a settled gig reduces net received as expected", async () => {
    const contractor = await fixtures.makePerson({ isPartner: false });
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 20000);
    await fixtures.makePayment(gig.id, 25000);
    await fixtures.makeRefund(gig.id, 5000, "adjustment");
    const allocation = await fixtures.makeFeeAllocation(gig.id, contractor.id, false);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 8000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: contractor.id, roleName: "Performer", feeAllocationId: allocation.id });
    const expense = await fixtures.makeExpense({ amount: 8000 });
    await fixtures.linkExpenseToAllocation(allocation.id, expense.id);

    const result = await getAccounting();
    expect(result.predictedSummary.settledNetReceived).toBe(20000); // 25000 paid - 5000 adjustment refund
    expect(result.businessProfit).toBe(12000); // 20000 - 8000
  });

  test("a showcase-linked expense appears in the showcase bucket, not fee allocation or other", async () => {
    const attribution = await fixtures.makeAttribution();
    const showcase = await fixtures.makeShowcase(attribution.id);
    const expense = await fixtures.makeExpense({ amount: 7500, description: "Venue hire" });
    await fixtures.linkExpenseToShowcase(showcase.id, expense.id);

    const result = await getAccounting();
    expect(result.expensesBreakdown.showcase).toBe(7500);
    expect(result.expensesBreakdown.feeAllocation).toBe(0);
    expect(result.expensesBreakdown.other).toBe(0);
    expect(result.expenses).toBe(7500);
  });

  test("an expense with no gig or showcase link falls into 'other'", async () => {
    await fixtures.makeExpense({ amount: 3000, description: "Website hosting" });

    const result = await getAccounting();
    expect(result.expensesBreakdown.other).toBe(3000);
    expect(result.expensesBreakdown.feeAllocation).toBe(0);
    expect(result.expensesBreakdown.showcase).toBe(0);
  });

  test("an expense linked only to an unsettled gig's fee allocation is invisible until the gig settles", async () => {
    const contractor = await fixtures.makePerson({ isPartner: false });
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 50000);
    // No payment recorded — gig is not settled.
    const allocation = await fixtures.makeFeeAllocation(gig.id, contractor.id, false);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 20000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: contractor.id, roleName: "Performer", feeAllocationId: allocation.id });
    const expense = await fixtures.makeExpense({ amount: 20000 });
    await fixtures.linkExpenseToAllocation(allocation.id, expense.id);

    const result = await getAccounting();
    // Not settled, so this expense contributes to NEITHER feeAllocation NOR other.
    expect(result.expensesBreakdown.feeAllocation).toBe(0);
    expect(result.expensesBreakdown.other).toBe(0);
    expect(result.expenses).toBe(0);
  });

  test("an expense shared across two gigs (via apportioned_amount) is counted once, at its full amount", async () => {
    // Deliberate: the Accounting page does NOT apportion expenses per gig — see
    // ACCOUNTING.md → "Expense apportionment on the Accounting page".
    const contractorA = await fixtures.makePerson({ isPartner: false });
    const contractorB = await fixtures.makePerson({ isPartner: false });
    const { allocation: allocationA } = await fixtures.makeSettledGig({ billingAmount: 30000, feeAmount: 0, personId: contractorA.id, isPartner: false });
    const { allocation: allocationB } = await fixtures.makeSettledGig({ billingAmount: 30000, feeAmount: 0, personId: contractorB.id, isPartner: false });

    // A single shared expense (e.g. rehearsal room) linked to both gigs' allocations.
    const sharedExpense = await fixtures.makeExpense({ amount: 10000, description: "Shared rehearsal room" });
    await fixtures.linkExpenseToAllocation(allocationA.id, sharedExpense.id);
    await fixtures.linkExpenseToAllocation(allocationB.id, sharedExpense.id);

    const result = await getAccounting();
    // Counted once, at its full £100 — not £50 per gig, not £200 total.
    expect(result.expensesBreakdown.feeAllocation).toBe(10000);
  });

  test("partner allocation data audit finds no rows when data is clean", async () => {
    const partner = await fixtures.makePartner();
    await fixtures.makeSettledGig({ billingAmount: 30000, feeAmount: 10000, personId: partner.id, isPartner: true });

    const { readPartnerAllocationDataAudit } = await import("../../src/repository/accounting.js");
    const rows = await readPartnerAllocationDataAudit();
    expect(rows).toEqual([]);
  });

  test("partner allocation data audit flags a partner allocation that was incorrectly linked to an expense", async () => {
    const partner = await fixtures.makePartner();
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 20000);
    await fixtures.makePayment(gig.id, 20000);
    const allocation = await fixtures.makeFeeAllocation(gig.id, partner.id, true);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 5000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: partner.id, roleName: "Performer", feeAllocationId: allocation.id });

    // Simulate the data-entry mistake: linking an expense to a PARTNER allocation.
    const expense = await fixtures.makeExpense({ amount: 5000 });
    await fixtures.linkExpenseToAllocation(allocation.id, expense.id);

    const { readPartnerAllocationDataAudit } = await import("../../src/repository/accounting.js");
    const rows = await readPartnerAllocationDataAudit();
    expect(rows).toHaveLength(1);
    expect(rows[0].allocation_id).toBe(allocation.id);
    expect(rows[0].person_id).toBe(partner.id);
  });
});

describe("Internal consistency — business profit vs. sum of per-gig confirmed profit", () => {
  test("business profit equals sum of confirmed profit plus partner allocations minus overheads", async () => {
    // Gig 1: settled, profitable. Billing £500, fees £200 (contractor). Confirmed profit = £300.
    const contractorA = await fixtures.makePerson({ isPartner: false });
    await fixtures.makeSettledGig({ billingAmount: 50000, feeAmount: 20000, personId: contractorA.id, isPartner: false });

    // Gig 2: settled, partner-only. Billing £400, fees £150 (partner, no expense). Confirmed profit = £250.
    const partner = await fixtures.makePartner();
    await fixtures.makeSettledGig({ billingAmount: 40000, feeAmount: 15000, personId: partner.id, isPartner: true });

    // Non-gig overhead: a showcase expense of £80, unrelated to either gig above.
    const attribution = await fixtures.makeAttribution();
    const showcase = await fixtures.makeShowcase(attribution.id);
    const showcaseExpense = await fixtures.makeExpense({ amount: 8000 });
    await fixtures.linkExpenseToShowcase(showcase.id, showcaseExpense.id);

    // Non-gig overhead: an unlinked "other" expense of £30.
    await fixtures.makeExpense({ amount: 3000, description: "Admin software" });

    const gig1ConfirmedProfit = await confirmedProfitForGig(50000, 20000); // 30000
    const gig2ConfirmedProfit = await confirmedProfitForGig(40000, 15000); // 25000
    const sumOfPerGigProfit = gig1ConfirmedProfit + gig2ConfirmedProfit; // 55000

    const result = await getAccounting();
    const overheads = result.expensesBreakdown.showcase + result.expensesBreakdown.other; // 8000 + 3000 = 11000

    // IMPORTANT — see ACCOUNTING.md → "Internal consistency" for the full derivation.
    // Per-gig confirmedProfit subtracts EVERY fee allocation (partner + contractor).
    // businessProfit only subtracts contractor allocations (via their linked expenses);
    // partner allocations must be added BACK here, because they were never subtracted
    // from businessProfit in the first place. This is exactly the mismatch that
    // originally motivated this whole audit — the two figures answer different
    // questions and must not be naively compared without this adjustment.
    const expectedBusinessProfit = sumOfPerGigProfit + result.feeAllocationsTotal - overheads; // 55000 + 15000 - 11000 = 59000

    expect(result.businessProfit).toBe(expectedBusinessProfit);

    // Show the working in the assertion message if this ever fails.
    if (result.businessProfit !== expectedBusinessProfit) {
      throw new Error(
        `Internal consistency check failed.\n` +
        `  sum(per-gig confirmed profit)      = ${sumOfPerGigProfit}\n` +
        `  + settled partner fee allocations   = ${result.feeAllocationsTotal}\n` +
        `  - overheads (showcase + other)      = ${overheads}\n` +
        `  expected business profit            = ${expectedBusinessProfit}\n` +
        `  actual businessProfit from summary  = ${result.businessProfit}`
      );
    }
  });
});

describe("Card charges net-zero", () => {
  test("a card charge increases billing and has a matching expense, leaving business profit unaffected", async () => {
    const contractor = await fixtures.makePerson({ isPartner: false });

    // Baseline gig with no card charge.
    await fixtures.makeSettledGig({ billingAmount: 30000, feeAmount: 10000, personId: contractor.id, isPartner: false });
    const baseline = await getAccounting();

    await resetDatabase(pool);

    // Same gig, but the client also paid a £5 card charge. `addCardCharge`
    // creates BOTH the invoice card charge (increases billing/net received
    // once paid) AND its linked expense (increases expenses) atomically —
    // this is the real code path a card charge is created through, not a
    // hand-rolled substitute.
    const contractor2 = await fixtures.makePerson({ isPartner: false });
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 30000);

    const invoicesService = await import("../../src/services/invoices.js");
    const invoice = await invoicesService.createInvoice({ gigId: gig.id, invoiceType: "balance" });
    await invoicesService.addCardCharge(invoice.id, { description: "Card fee", amount: 500 });

    await fixtures.makePayment(gig.id, 30500); // client pays billing + card charge
    const allocation = await fixtures.makeFeeAllocation(gig.id, contractor2.id, false);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 10000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: contractor2.id, roleName: "Performer", feeAllocationId: allocation.id });
    const feeExpense = await fixtures.makeExpense({ amount: 10000 });
    await fixtures.linkExpenseToAllocation(allocation.id, feeExpense.id);

    const withCardCharge = await getAccounting();

    expect(withCardCharge.businessProfit).toBe(baseline.businessProfit);
  });
});

describe("Tax-only expenses", () => {
  test("a tax-only expense is excluded from all expense breakdown buckets", async () => {
    const contractor = await fixtures.makePerson({ isPartner: false });
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 50000);
    await fixtures.makePayment(gig.id, 50000);
    
    const allocation = await fixtures.makeFeeAllocation(gig.id, contractor.id, false);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 15000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: contractor.id, roleName: "Performer", feeAllocationId: allocation.id });
    
    // Regular expense linked to the allocation
    const regularExpense = await fixtures.makeExpense({ amount: 15000, description: "Fee payment" });
    await fixtures.linkExpenseToAllocation(allocation.id, regularExpense.id);
    
    // Tax-only expense (no allocation link)
    const taxOnlyExpense = await fixtures.makeExpense({ amount: 5000, description: "Tax deduction", isTaxOnly: true });

    const result = await getAccounting();
    
    // Tax-only expense should NOT appear in any breakdown bucket
    expect(result.expensesBreakdown.feeAllocation).toBe(15000); // only regular expense
    expect(result.expensesBreakdown.showcase).toBe(0);
    expect(result.expensesBreakdown.other).toBe(0);
    expect(result.expenses).toBe(15000);
  });

  test("taxOnlyExpensesTotal sums all tax-only expenses regardless of amount", async () => {
    await fixtures.makeExpense({ amount: 3000, isTaxOnly: true });
    await fixtures.makeExpense({ amount: 7500, isTaxOnly: true });
    await fixtures.makeExpense({ amount: 2000, description: "Regular", isTaxOnly: false });

    const result = await getAccounting();
    
    // Only the two tax-only expenses are summed
    expect(result.taxOnlyExpensesTotal).toBe(10500);
  });

  test("taxableProfit = businessProfit - taxOnlyExpensesTotal", async () => {
    const contractor = await fixtures.makePerson({ isPartner: false });
    const gig = await fixtures.makeGig();
    await fixtures.makeLineItem(gig.id, 100000);
    await fixtures.makePayment(gig.id, 100000);
    
    const allocation = await fixtures.makeFeeAllocation(gig.id, contractor.id, false);
    await fixtures.makeFeeAllocationLineItem(allocation.id, 30000);
    await fixtures.makeAssignedRole({ gigId: gig.id, personId: contractor.id, roleName: "Performer", feeAllocationId: allocation.id });
    
    const regularExpense = await fixtures.makeExpense({ amount: 30000 });
    await fixtures.linkExpenseToAllocation(allocation.id, regularExpense.id);
    
    // Add tax-only expenses
    await fixtures.makeExpense({ amount: 10000, isTaxOnly: true });

    const result = await getAccounting();
    
    // businessProfit = 100000 (settled net) - 30000 (regular expenses) = 70000
    expect(result.businessProfit).toBe(70000);
    expect(result.taxOnlyExpensesTotal).toBe(10000);
    // taxableProfit = 70000 - 10000 = 60000
    expect(result.taxableProfit).toBe(60000);
  });

  test("tax-only expenses from multiple partners are all included in taxableProfit", async () => {
    const partner1 = await fixtures.makePartner();
    const partner2 = await fixtures.makePartner();
    
    const gig1 = await fixtures.makeGig();
    await fixtures.makeLineItem(gig1.id, 50000);
    await fixtures.makePayment(gig1.id, 50000);
    
    const alloc1 = await fixtures.makeFeeAllocation(gig1.id, partner1.id, true);
    await fixtures.makeFeeAllocationLineItem(alloc1.id, 10000);
    await fixtures.makeAssignedRole({ gigId: gig1.id, personId: partner1.id, roleName: "Vocals", feeAllocationId: alloc1.id });
    
    const gig2 = await fixtures.makeGig();
    await fixtures.makeLineItem(gig2.id, 60000);
    await fixtures.makePayment(gig2.id, 60000);
    
    const alloc2 = await fixtures.makeFeeAllocation(gig2.id, partner2.id, true);
    await fixtures.makeFeeAllocationLineItem(alloc2.id, 12000);
    await fixtures.makeAssignedRole({ gigId: gig2.id, personId: partner2.id, roleName: "Bass", feeAllocationId: alloc2.id });
    
    // Each partner claims their own tax-only expenses
    await fixtures.makeExpense({ amount: 5000, isTaxOnly: true, description: `${partner1.firstName}'s tax deduction` });
    await fixtures.makeExpense({ amount: 3000, isTaxOnly: true, description: `${partner2.firstName}'s tax deduction` });

    const result = await getAccounting();
    
    // businessProfit = 110000 (50000 + 60000 net) - 0 (no regular expenses) = 110000
    // feeAllocationsTotal = 22000 (10000 + 12000, partners not expenses)
    // confirmedSharedProfit = 110000 - 22000 = 88000
    expect(result.businessProfit).toBe(110000);
    expect(result.feeAllocationsTotal).toBe(22000);
    
    // taxOnlyExpensesTotal = 8000
    // taxableProfit = 110000 - 8000 = 102000
    expect(result.taxOnlyExpensesTotal).toBe(8000);
    expect(result.taxableProfit).toBe(102000);
  });
});
