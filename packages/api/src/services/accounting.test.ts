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

jest.unstable_mockModule("../repository/accounting.js", () => ({
  readGigCounts,
  readExpensesBreakdown,
  readPartnerFeeAllocations,
  readPredictedProfitSummary,
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

  test("rejects both year and taxYearStart provided together", async () => {
    stubRepo({});
    await expect(getSummary({ year: 2024, taxYearStart: 2024 })).rejects.toThrow(
      "Provide either year or taxYearStart, not both"
    );
  });
});
