import { calcBillingTotals } from "@get-down/shared";

describe("calcBillingTotals", () => {
  test("credit: goodwill cash gesture reduces both billing total and net received", () => {
    // Scenario: Client owes £100, has paid £50 so far.
    // Staff decides to give them £20 cash as a goodwill gesture (reduces both their debt and what we collect).
    // Expected: billing total £100 → £80, net received £50 → £30 (after handing back £20).
    // Balance due = £80 - £30 = £50 (they still owe £50 more).
    const subtotal = 100;
    const discountPercent = 0;
    const travelCost = 0;
    const totalCredits = 20; // credit (goodwill cash, reduces billing total)
    const totalPaid = 50;
    const totalRefunded = 20; // same £20 comes out of net received
    const totalAdditionalCharges = 0;

    const result = calcBillingTotals({
      subtotal,
      discountPercent,
      travelCost,
      totalCredits,
      totalPaid,
      totalRefunded,
      totalAdditionalCharges,
    });

    expect(result.billingTotal).toBe(80); // £100 - £20 credit
    expect(result.netReceived).toBe(30); // £50 paid - £20 refunded
    expect(result.balanceAmount).toBe(50); // £80 owed - £30 net received = £50 still owed
  });

  test("adjustment: overpayment refund reduces net received only, billing total unchanged", () => {
    // Scenario: Client overpaid, service was removed, need to refund £30.
    // Original bill £100, original payment £130, refund £30 as adjustment.
    // Expected: billing total stays £100, net received £130 → £100, balance due £0.
    const subtotal = 100;
    const discountPercent = 0;
    const travelCost = 0;
    const totalCredits = 0; // no price reductions
    const totalPaid = 130;
    const totalRefunded = 30; // adjustment (refund for overpayment, reduces net received only)
    const totalAdditionalCharges = 0;

    const result = calcBillingTotals({
      subtotal,
      discountPercent,
      travelCost,
      totalCredits,
      totalPaid,
      totalRefunded,
      totalAdditionalCharges,
    });

    expect(result.billingTotal).toBe(100); // unchanged
    expect(result.netReceived).toBe(100); // £130 paid - £30 refunded
    expect(result.balanceAmount).toBe(0); // £100 - £100 = £0
  });

  test("combination: credit and adjustment work together correctly", () => {
    // Scenario: £1000 bill, client paid £1200 (overpayment).
    // Staff gives £50 cash as goodwill (credit), refunds £100 as an adjustment.
    // Expected: billing total £1000 → £950 (reduce by credit),
    // net received £1200 - £50 (credit refund) - £100 (adjustment) = £1050,
    // balance due £950 - £1050 = £0 (actually, we collected more than owed).
    const subtotal = 1000;
    const discountPercent = 0;
    const travelCost = 0;
    const totalCredits = 50; // credit (goodwill)
    const totalPaid = 1200;
    const totalRefunded = 150; // £50 credit + £100 adjustment
    const totalAdditionalCharges = 0;

    const result = calcBillingTotals({
      subtotal,
      discountPercent,
      travelCost,
      totalCredits,
      totalPaid,
      totalRefunded,
      totalAdditionalCharges,
    });

    expect(result.billingTotal).toBe(950); // £1000 - £50 credit
    expect(result.netReceived).toBe(1050); // £1200 - £150 refunded
    expect(result.balanceAmount).toBe(0); // capped at 0 (we over-collected)
  });

  test("write-off: multiple write-offs sum correctly", () => {
    // Scenario: £1000 bill, paid in full. Then two write-offs: £5 + £10 = £15 forgiven.
    // Expected: billing total £1000 → £985, net received unchanged £1000, balance due £985 - £1000 = £0.
    const subtotal = 1000;
    const discountPercent = 0;
    const travelCost = 0;
    const totalCredits = 15; // two write-offs: £5 + £10
    const totalPaid = 1000;
    const totalRefunded = 0; // no cash refunds
    const totalAdditionalCharges = 0;

    const result = calcBillingTotals({
      subtotal,
      discountPercent,
      travelCost,
      totalCredits,
      totalPaid,
      totalRefunded,
      totalAdditionalCharges,
    });

    expect(result.billingTotal).toBe(985); // £1000 - £15 write-off
    expect(result.netReceived).toBe(1000); // unchanged, no cash moved
    expect(result.balanceAmount).toBe(0); // £985 - £1000, capped at 0
  });
});
