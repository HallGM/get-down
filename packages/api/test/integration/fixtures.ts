/**
 * Fixture builders for integration tests. Every helper writes through the
 * real repository layer (the same functions the API uses), so integration
 * tests exercise real SQL and real constraints, not a re-implementation.
 *
 * Keep these builders deliberately simple and single-purpose — they exist to
 * make test setup readable, not to encode any accounting logic of their own.
 *
 * IMPORTANT: every repository module is imported dynamically (lazily) inside
 * each function, not statically at the top of this file. `db/init.ts`
 * constructs its Postgres connection pool at import time from environment
 * variables, and `test/integration/setup.ts` only sets `DATABASE_URL` to the
 * Testcontainers instance inside `startDatabase()`. If this file statically
 * imported any repository module, that module (and therefore `db/init.ts`)
 * would load — and connect — before `startDatabase()` ever runs, silently
 * pointing every fixture at the developer's local `.env` database instead of
 * the disposable test container.
 */
import type { GigMutationInput } from "../../src/repository/gigs.js";
import type { PersonMutationInput } from "../../src/repository/people.js";
import type { AssignedRoleMutationInput } from "../../src/repository/assigned_roles.js";
import type { ExpenseMutationInput } from "../../src/repository/expenses.js";

let gigCounter = 0;
let personCounter = 0;

export async function makeGig(overrides: Partial<GigMutationInput> = {}) {
  const { createGig } = await import("../../src/repository/gigs.js");
  gigCounter += 1;
  return createGig({
    status: "confirmed",
    firstName: `Client${gigCounter}`,
    lastName: "Test",
    travelCost: 0,
    discountPercent: 0,
    ...overrides,
    // Explicit fallback for date: spreading `overrides` above can carry an
    // explicit `date: undefined` (e.g. when a caller does `{ date: opts.date }`
    // and `opts.date` is undefined), which would otherwise silently overwrite
    // this default. Applying the fallback AFTER the spread guarantees a date
    // is always set, matching the NOT NULL constraint on gigs.date.
    date: overrides.date ?? "2025-06-01",
  });
}

export async function makeLineItem(gigId: number, amount: number, discountPercent = 0, description = "Live band") {
  const { createGigLineItem } = await import("../../src/repository/gig_line_items.js");
  return createGigLineItem(gigId, description, amount, discountPercent);
}

export async function makePayment(gigId: number, amount: number, date = "2025-06-01") {
  const { createPayment } = await import("../../src/repository/payments.js");
  return createPayment({ gigId, amount, date });
}

export async function makeRefund(
  gigId: number,
  amount: number,
  subtype: "credit" | "adjustment" | "write_off",
  date = "2025-06-02"
) {
  const { createRefund } = await import("../../src/repository/refunds.js");
  return createRefund({ gigId, amount, subtype, date });
}

export async function makePerson(overrides: Partial<PersonMutationInput> = {}) {
  const { createPerson } = await import("../../src/repository/people.js");
  personCounter += 1;
  return createPerson({
    firstName: `Person${personCounter}`,
    isPartner: false,
    isActive: true,
    ...overrides,
  });
}

export async function makePartner(overrides: Partial<PersonMutationInput> = {}) {
  return makePerson({ isPartner: true, ...overrides });
}

export async function makeAssignedRole(input: AssignedRoleMutationInput) {
  const { createAssignedRole } = await import("../../src/repository/assigned_roles.js");
  return createAssignedRole(input);
}

export async function makeFeeAllocation(gigId: number, personId: number, confirmed = false) {
  const { createFeeAllocation, updateConfirmed } = await import("../../src/repository/fee_allocations.js");
  const allocation = await createFeeAllocation({ gigId, personId, isInvoiced: false });
  if (confirmed) {
    await updateConfirmed(allocation.id, true);
  }
  return allocation;
}

export async function makeShowcaseFeeAllocation() {
  const { createFeeAllocation } = await import("../../src/repository/fee_allocations.js");
  return createFeeAllocation({ isInvoiced: false });
}

export async function makeFeeAllocationLineItem(allocationId: number, amount: number, description = "Performance fee") {
  const { createLineItem } = await import("../../src/repository/fee_allocations.js");
  return createLineItem(allocationId, description, amount);
}

export async function makeExpense(overrides: Partial<ExpenseMutationInput> = {}) {
  const { createExpense } = await import("../../src/repository/expenses.js");
  return createExpense({
    amount: 10000,
    description: "Test expense",
    ...overrides,
  });
}

export async function linkExpenseToAllocation(allocationId: number, expenseId: number) {
  const { linkExpenseToAllocation: link } = await import("../../src/repository/fee_allocations.js");
  return link(allocationId, expenseId);
}

export async function makeAttribution(overrides: Partial<{ name: string; type: string }> = {}) {
  const { createAttribution } = await import("../../src/repository/attributions.js");
  return createAttribution({
    name: overrides.name ?? "Test attribution",
    type: overrides.type ?? "showcase",
  });
}

export async function makeShowcase(attributionId: number, date = "2025-05-01") {
  const { createShowcase } = await import("../../src/repository/showcases.js");
  return createShowcase({ attributionId, date });
}

export async function linkExpenseToShowcase(showcaseId: number, expenseId: number) {
  const { linkExpenseToShowcase: link } = await import("../../src/repository/showcases.js");
  return link(showcaseId, expenseId);
}

/**
 * Wires up a fully "settled" gig in one call, per the six settlement rules in
 * services/ACCOUNTING.md → "Settled vs unsettled gig":
 *  - one line item for `billingAmount`
 *  - a payment of exactly `billingAmount` (so billing == net received)
 *  - one assigned role, linked to a fee allocation for `person`
 *  - a fee-allocation line item of `feeAmount`
 *  - if `person` is a partner, the allocation is confirmed; otherwise an
 *    expense is created and linked to the allocation (proof of payment)
 */
export async function makeSettledGig(opts: {
  billingAmount: number;
  feeAmount: number;
  personId: number;
  isPartner: boolean;
  date?: string;
}) {
  const gig = await makeGig({ date: opts.date });
  await makeLineItem(gig.id, opts.billingAmount);
  await makePayment(gig.id, opts.billingAmount, opts.date ?? "2025-06-01");
  const allocation = await makeFeeAllocation(gig.id, opts.personId, opts.isPartner);
  await makeFeeAllocationLineItem(allocation.id, opts.feeAmount);
  await makeAssignedRole({ gigId: gig.id, personId: opts.personId, roleName: "Performer", feeAllocationId: allocation.id });
  if (!opts.isPartner) {
    const expense = await makeExpense({ amount: opts.feeAmount, description: "Contractor payment" });
    await linkExpenseToAllocation(allocation.id, expense.id);
  }
  return { gig, allocation };
}
