import { jest } from "@jest/globals";
import type { VatTransactionRow, VatUndatedCounts } from "../repository/vat.js";

const readTransactions = jest.fn<(start: string, end: string) => Promise<VatTransactionRow[]>>();
const readUndatedCounts = jest.fn<() => Promise<VatUndatedCounts>>();

jest.unstable_mockModule("../repository/vat.js", () => ({ readTransactions, readUndatedCounts }));

const { getReport } = await import("./vat.js");

describe("VAT report service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readUndatedCounts.mockResolvedValue({ payments: 2, refunds: 1 });
  });

  test("builds a before-selected-date inclusive rolling period and running total", async () => {
    readTransactions.mockResolvedValue([
      { id: 1, type: "payment", date: "2025-07-01", amount: 10000, client_first_name: "A", client_last_name: "Client", refund_subtype: null },
      { id: 2, type: "refund", date: "2026-01-01", amount: 2500, client_first_name: "A", client_last_name: "Client", refund_subtype: "credit" },
    ]);

    const result = await getReport({ mode: "before", date: "2026-06-30" });

    expect(readTransactions).toHaveBeenCalledWith("2025-07-01", "2026-06-30");
    expect(result.periodStart).toBe("2025-07-01");
    expect(result.periodEnd).toBe("2026-06-30");
    expect(result.turnover).toBe(7500);
    expect(result.transactions.map((t) => t.runningTotal)).toEqual([10000, 7500]);
    expect(result.undatedPayments).toBe(2);
    expect(result.undatedRefunds).toBe(1);
  });

  test("builds an after-selected-date period and rejects invalid calendar dates", async () => {
    readTransactions.mockResolvedValue([]);
    const result = await getReport({ mode: "after", date: "2025-07-01" });
    expect(readTransactions).toHaveBeenCalledWith("2025-07-01", "2026-06-30");
    expect(result.transactions).toEqual([]);
    await expect(getReport({ mode: "before", date: "2025-02-30" })).rejects.toThrow("valid calendar date");
  });
});
