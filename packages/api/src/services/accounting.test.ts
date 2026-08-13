import { jest } from "@jest/globals";

/**
 * Unit tests for the Accounting page summary calculation. The repository layer
 * is stubbed with hand-worked numbers so each formula in `getSummary` can be
 * checked in isolation, without a database. See ./ACCOUNTING.md for what each
 * figure means; these tests assert the arithmetic matches that definition.
 *
 * Native ESM does not allow spying on named exports directly (they are
 * read-only bindings), so the repository module is mocked wholesale with
 * `jest.unstable_mockModule` and the service under test is imported
 * dynamically afterwards, per Jest's documented ESM mocking pattern.
 */

type GigCounts = { booked: number; performed: number };
type ExpensesBreakdown = { feeAllocation: number; showcase: number; other: number };
type PartnerAllocation = { person_id: number; first_name: string | null; last_name: string | null; display_name: string | null; amount: number };
type PredictedSummary = {
  settledNetReceived: number;
  predictedBillingUnsettled: number;
  predictedFeeAllocUnsettled: number;
  predictedSharedProfit: number;
  excludedCount: number;
};

const readGigCounts = jest.fn<() => Promise<GigCounts>>();
const readExpensesBreakdown = jest.fn<() => Promise<ExpensesBreakdown>>();
const readPartnerFeeAllocations = jest.fn<() => Promise<PartnerAllocation[]>>();
const readPredictedProfitSummary = jest.fn<() => Promise<PredictedSummary>>();
const readTaxOnlyExpensesTotal = jest.fn<() => Promise<number>>();

jest.unstable_mockModule("../repository/accounting.js", () => ({
  readGigCounts,
  readExpensesBreakdown,
  readPartnerFeeAllocations,
  readPredictedProfitSummary,
  readTaxOnlyExpensesTotal,
}));

const { getSummary } = await import("./accounting.js");

describe("accounting service — getSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function stubRepo(overrides: {
    gigCounts?: GigCounts;
    expensesBreakdown?: ExpensesBreakdown;
    partnerAllocations?: PartnerAllocation[];
    predictedSummary?: PredictedSummary;
    taxOnlyTotal?: number;
  }) {
    readGigCounts.mockResolvedValue(overrides.gigCounts ?? { booked: 0, performed: 0 });
    readExpensesBreakdown.mockResolvedValue(
      overrides.expensesBreakdown ?? { feeAllocation: 0, showcase: 0, other: 0 }
    );
    readPartnerFeeAllocations.mockResolvedValue(overrides.partnerAllocations ?? []);
    readPredictedProfitSummary.mockResolvedValue(
      overrides.predictedSummary ?? {
        settledNetReceived: 0,
        predictedBillingUnsettled: 0,
        predictedFeeAllocUnsettled: 0,
        predictedSharedProfit: 0,
        excludedCount: 0,
      }
    );
    readTaxOnlyExpensesTotal.mockResolvedValue(overrides.taxOnlyTotal ?? 0);
  }

  test("gig activity counts pass through unchanged", async () => {
    stubRepo({ gigCounts: { booked: 12, performed: 9 } });
    const result = await getSummary({});
    expect(result.gigsBooked).toBe(12);
    expect(result.gigsPerformed).toBe(9);
  });

  test("expenses total is the sum of the three buckets", async () => {
    stubRepo({ expensesBreakdown: { feeAllocation: 10000, showcase: 5000, other: 2500 } });
    const result = await getSummary({});
    expect(result.expenses).toBe(17500);
    expect(result.expensesBreakdown).toEqual({ feeAllocation: 10000, showcase: 5000, other: 2500 });
  });

  test("business profit is settled net received minus settled expenses only", async () => {
    stubRepo({
      predictedSummary: {
        settledNetReceived: 100000,
        predictedBillingUnsettled: 999999, // must NOT affect business profit
        predictedFeeAllocUnsettled: 999999, // must NOT affect business profit
        predictedSharedProfit: 999999, // must NOT affect business profit
        excludedCount: 0,
      },
      expensesBreakdown: { feeAllocation: 30000, showcase: 10000, other: 5000 },
    });
    const result = await getSummary({});
    expect(result.businessProfit).toBe(100000 - 45000);
  });

  test("business profit never subtracts partner fee allocations directly (no double subtraction)", async () => {
    // Partner allocations are NOT part of expensesBreakdown in this stub — proving
    // that businessProfit (settledNetReceived - expenses) is unaffected by them.
    stubRepo({
      predictedSummary: {
        settledNetReceived: 50000,
        predictedBillingUnsettled: 0,
        predictedFeeAllocUnsettled: 0,
        predictedSharedProfit: 0,
        excludedCount: 0,
      },
      expensesBreakdown: { feeAllocation: 0, showcase: 0, other: 0 },
      partnerAllocations: [
        { person_id: 1, first_name: "Ada", last_name: null, display_name: null, amount: 20000 },
      ],
    });
    const result = await getSummary({});
    expect(result.businessProfit).toBe(50000); // unaffected by the £200 partner allocation
    expect(result.feeAllocationsTotal).toBe(20000); // shown separately
    expect(result.confirmedSharedProfit).toBe(30000); // only subtracted here, once
  });

  test("confirmed shared profit subtracts partner allocations exactly once", async () => {
    stubRepo({
      predictedSummary: {
        settledNetReceived: 80000,
        predictedBillingUnsettled: 0,
        predictedFeeAllocUnsettled: 0,
        predictedSharedProfit: 0,
        excludedCount: 0,
      },
      expensesBreakdown: { feeAllocation: 20000, showcase: 0, other: 0 },
      partnerAllocations: [
        { person_id: 1, first_name: "Ada", last_name: null, display_name: null, amount: 10000 },
        { person_id: 2, first_name: "Bea", last_name: null, display_name: null, amount: 15000 },
      ],
    });
    const result = await getSummary({});
    expect(result.feeAllocationsTotal).toBe(25000);
    expect(result.businessProfit).toBe(60000); // 80000 - 20000, partner fees not included here
    expect(result.confirmedSharedProfit).toBe(35000); // 60000 - 25000
  });

  test("predicted shared profit and predicted fee allocations are forecast-only and separate from settled figures", async () => {
    stubRepo({
      predictedSummary: {
        settledNetReceived: 0,
        predictedBillingUnsettled: 40000,
        predictedFeeAllocUnsettled: 15000,
        predictedSharedProfit: 25000,
        excludedCount: 2,
      },
    });
    const result = await getSummary({});
    expect(result.predictedBillingUnsettled).toBe(40000);
    expect(result.predictedFeeAllocations).toBe(15000);
    expect(result.predictedSharedProfit).toBe(25000);
    expect(result.predictedProfitExcludedCount).toBe(2);
    // Predicted figures never leak into the settled businessProfit / confirmedSharedProfit.
    expect(result.businessProfit).toBe(0);
    expect(result.confirmedSharedProfit).toBe(0);
  });

  test("rejects when only start is provided", async () => {
    stubRepo({});
    await expect(getSummary({ start: "2024-01-01" })).rejects.toThrow(
      "Provide both start and end, or neither"
    );
  });

  test("rejects when only end is provided", async () => {
    stubRepo({});
    await expect(getSummary({ end: "2024-12-31" })).rejects.toThrow(
      "Provide both start and end, or neither"
    );
  });

  test("rejects when end is before start", async () => {
    stubRepo({});
    await expect(getSummary({ start: "2024-12-31", end: "2024-01-01" })).rejects.toThrow(
      "start date must not be after end date"
    );
  });

  test("taxable profit is business profit minus tax-only expenses", async () => {
    stubRepo({
      predictedSummary: {
        settledNetReceived: 100000,
        predictedBillingUnsettled: 0,
        predictedFeeAllocUnsettled: 0,
        predictedSharedProfit: 0,
        excludedCount: 0,
      },
      expensesBreakdown: { feeAllocation: 30000, showcase: 5000, other: 5000 },
      taxOnlyTotal: 3000,
    });
    const result = await getSummary({});
    expect(result.businessProfit).toBe(60000); // 100000 - 40000
    expect(result.taxOnlyExpensesTotal).toBe(3000);
    expect(result.taxableProfit).toBe(57000); // 60000 - 3000
  });

  test("taxable profit equals business profit when no tax-only expenses", async () => {
    stubRepo({
      predictedSummary: {
        settledNetReceived: 100000,
        predictedBillingUnsettled: 0,
        predictedFeeAllocUnsettled: 0,
        predictedSharedProfit: 0,
        excludedCount: 0,
      },
      expensesBreakdown: { feeAllocation: 20000, showcase: 0, other: 0 },
      taxOnlyTotal: 0,
    });
    const result = await getSummary({});
    expect(result.businessProfit).toBe(80000);
    expect(result.taxOnlyExpensesTotal).toBe(0);
    expect(result.taxableProfit).toBe(80000);
  });

  test("respects explicit start/end date range", async () => {
    stubRepo({
      predictedSummary: {
        settledNetReceived: 50000,
        predictedBillingUnsettled: 0,
        predictedFeeAllocUnsettled: 0,
        predictedSharedProfit: 0,
        excludedCount: 0,
      },
      expensesBreakdown: { feeAllocation: 10000, showcase: 0, other: 0 },
    });
    const result = await getSummary({ start: "2024-03-15", end: "2024-06-30" });
    expect(result.businessProfit).toBe(40000);
  });

  test("floors explicit start date to partnership start date", async () => {
    stubRepo({
      predictedSummary: {
        settledNetReceived: 25000,
        predictedBillingUnsettled: 0,
        predictedFeeAllocUnsettled: 0,
        predictedSharedProfit: 0,
        excludedCount: 0,
      },
      expensesBreakdown: { feeAllocation: 5000, showcase: 0, other: 0 },
    });
    // Pass a date before the partnership start (which is 2018-01-01 in constants)
    const result = await getSummary({ start: "2000-01-01", end: "2024-12-31" });
    expect(result.businessProfit).toBe(20000);
  });

  test("treats absent start/end as all-time", async () => {
    stubRepo({
      predictedSummary: {
        settledNetReceived: 75000,
        predictedBillingUnsettled: 0,
        predictedFeeAllocUnsettled: 0,
        predictedSharedProfit: 0,
        excludedCount: 0,
      },
      expensesBreakdown: { feeAllocation: 15000, showcase: 0, other: 0 },
    });
    const result = await getSummary({});
    expect(result.businessProfit).toBe(60000);
  });
});
