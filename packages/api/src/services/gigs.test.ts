import { calcBillingTotals, calcConfirmedProfit, calcInvoiceTotals } from "@get-down/shared";

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
    const totalCardCharges = 0;

    const result = calcBillingTotals({
      subtotal,
      discountPercent,
      travelCost,
      totalCredits,
      totalPaid,
      totalRefunded,
      totalCardCharges,
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
    const totalCardCharges = 0;

    const result = calcBillingTotals({
      subtotal,
      discountPercent,
      travelCost,
      totalCredits,
      totalPaid,
      totalRefunded,
      totalCardCharges,
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
    const totalCardCharges = 0;

    const result = calcBillingTotals({
      subtotal,
      discountPercent,
      travelCost,
      totalCredits,
      totalPaid,
      totalRefunded,
      totalCardCharges,
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
    const totalCardCharges = 0;

    const result = calcBillingTotals({
      subtotal,
      discountPercent,
      travelCost,
      totalCredits,
      totalPaid,
      totalRefunded,
      totalCardCharges,
    });

    expect(result.billingTotal).toBe(985); // £1000 - £15 write-off
    expect(result.netReceived).toBe(1000); // unchanged, no cash moved
    expect(result.balanceAmount).toBe(0); // £985 - £1000, capped at 0
  });
});

describe("calcConfirmedProfit", () => {
  test("profitable gig: billing exceeds total fee allocations", () => {
    // Client billed £500, all fee allocations (partner + contractor) total £300.
    // Confirmed profit is the £200 left over before any wider business overheads.
    expect(calcConfirmedProfit({ billingTotal: 50000, feesTotal: 30000 })).toBe(20000);
  });

  test("loss-making gig: fee allocations exceed billing", () => {
    expect(calcConfirmedProfit({ billingTotal: 10000, feesTotal: 15000 })).toBe(-5000);
  });

  test("includes both partner and contractor allocations in the deduction", () => {
    // Two role fees: one partner (£150), one contractor (£100). Both count against confirmed profit,
    // unlike the Accounting page's business profit, which excludes partner allocations.
    const partnerFee = 15000;
    const contractorFee = 10000;
    expect(calcConfirmedProfit({ billingTotal: 30000, feesTotal: partnerFee + contractorFee })).toBe(5000);
  });

  test("missing billingTotal defaults to zero", () => {
    expect(calcConfirmedProfit({ feesTotal: 5000 })).toBe(-5000);
  });

  test("missing feesTotal defaults to zero", () => {
    expect(calcConfirmedProfit({ billingTotal: 5000 })).toBe(5000);
  });

  test("both missing defaults to zero profit", () => {
    expect(calcConfirmedProfit({})).toBe(0);
  });
});

describe("calcInvoiceTotals", () => {
  // Regression test for bug (a): the GUI's old hand-rolled recalculation summed raw
  // line-item amounts and ignored each item's own discountPercent. The old (now-deleted)
  // GUI formula would have computed subtotal = 50000 + 20000 = £700, silently dropping
  // the photo booth's 20% discount and overwriting the invoice's correct stored subtotal
  // of £660 the next time anything on the invoice was edited.
  test("item-level discount reduces the subtotal (bug: GUI used to ignore this)", () => {
    const result = calcInvoiceTotals({
      lineItems: [
        { amount: 50000, discountPercent: 0 },   // DJ set: £500, no discount
        { amount: 20000, discountPercent: 20 },  // Photo booth: £200, 20% off -> £160
      ],
      totalCardCharges: 0,
      totalPaid: 0,
      discountPercent: 0,
      travelCost: 0,
      invoiceType: "balance",
    });

    expect(result.subtotal).toBe(66000); // £500 + £160, NOT £500 + £200 (£700)
  });

  // Regression test for bug (b): the GUI's old recalculation always added card charges
  // into `total`, even for a deposit invoice. The API deliberately keeps a deposit
  // invoice's stored total as service-only (card charges are tracked and paid
  // separately) — the old GUI formula would have computed total = £1000 + £6 = £1006,
  // overwriting the invoice's correct stored total of £1000.
  test("deposit invoice's total excludes card charges (bug: GUI used to include them)", () => {
    const result = calcInvoiceTotals({
      lineItems: [{ amount: 100000, discountPercent: 0 }], // £1000 service subtotal
      totalCardCharges: 600, // £6 card surcharge recorded against this invoice
      totalPaid: 0,
      discountPercent: 0,
      travelCost: 0,
      invoiceType: "deposit",
    });

    expect(result.serviceTotal).toBe(100000);
    expect(result.total).toBe(100000); // NOT 100600 — card charges excluded from a deposit's total
  });

  test("balance invoice's total includes card charges", () => {
    const result = calcInvoiceTotals({
      lineItems: [{ amount: 100000, discountPercent: 0 }],
      totalCardCharges: 600,
      totalPaid: 0,
      discountPercent: 0,
      travelCost: 0,
      invoiceType: "balance",
    });

    expect(result.total).toBe(100600); // service total plus card charges, unlike a deposit invoice
  });

  test("deposit invoice's amount due is 20% of service total, plus this invoice's own card charges, minus what's paid", () => {
    const result = calcInvoiceTotals({
      lineItems: [{ amount: 100000, discountPercent: 0 }], // service total £1000
      totalCardCharges: 600, // £6 surcharge already linked to this deposit invoice
      totalPaid: 5000, // £50 already paid towards the deposit
      discountPercent: 0,
      travelCost: 0,
      invoiceType: "deposit",
    });

    // 20% of £1000 = £200, plus £6 charge, minus £50 paid = £156
    expect(result.amountDue).toBe(15600);
  });

  test("balance invoice's amount due is the full total minus what's been paid", () => {
    const result = calcInvoiceTotals({
      lineItems: [{ amount: 100000, discountPercent: 0 }],
      totalCardCharges: 600,
      totalPaid: 50000,
      discountPercent: 0,
      travelCost: 0,
      invoiceType: "balance",
    });

    // total = £1006, paid £500, due = £506
    expect(result.amountDue).toBe(50600);
  });

  test("amount due never goes negative when the client has overpaid", () => {
    const result = calcInvoiceTotals({
      lineItems: [{ amount: 10000, discountPercent: 0 }],
      totalCardCharges: 0,
      totalPaid: 999999,
      discountPercent: 0,
      travelCost: 0,
      invoiceType: "balance",
    });

    expect(result.amountDue).toBe(0);
  });

  test("overall discount and travel cost apply to the service total", () => {
    const result = calcInvoiceTotals({
      lineItems: [{ amount: 100000, discountPercent: 0 }], // £1000
      totalCardCharges: 0,
      totalPaid: 0,
      discountPercent: 10, // 10% overall discount
      travelCost: 5000, // £50 travel
      invoiceType: "balance",
    });

    // £1000 - £100 discount + £50 travel = £950
    expect(result.discountAmount).toBe(10000);
    expect(result.serviceTotal).toBe(95000);
    expect(result.total).toBe(95000);
  });
});
