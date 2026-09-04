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

  test("builds the inclusive end-date period, running total, and rolling graph", async () => {
    readTransactions.mockResolvedValue([
      { id: 1, type: "payment", date: "2025-07-01", amount: 10000, client_first_name: "A", client_last_name: "Client", refund_subtype: null },
      { id: 2, type: "refund", date: "2026-01-01", amount: 2500, client_first_name: "A", client_last_name: "Client", refund_subtype: "credit" },
    ]);

    const result = await getReport({ date: "2026-06-30" });

    expect(readTransactions).toHaveBeenCalledWith("2024-07-02", "2026-06-30");
    expect(result.periodStart).toBe("2025-07-01");
    expect(result.periodEnd).toBe("2026-06-30");
    expect(result.turnover).toBe(7500);
    expect(result.transactions.map((t) => t.runningTotal)).toEqual([10000, 7500]);
    expect(result.graph).toHaveLength(365);
    expect(result.graph.at(-1)).toEqual({ date: "2026-06-30", turnover: 7500 });
    expect(result.undatedPayments).toBe(2);
    expect(result.undatedRefunds).toBe(1);
  });

  test("returns zero graph points and rejects invalid calendar dates", async () => {
    readTransactions.mockResolvedValue([]);
    const result = await getReport({ date: "2025-07-01" });
    expect(readTransactions).toHaveBeenCalledWith("2023-07-03", "2025-07-01");
    expect(result.transactions).toEqual([]);
    expect(result.graph.every((point) => point.turnover === 0)).toBe(true);
    await expect(getReport({ date: "2025-02-30" })).rejects.toThrow("valid calendar date");
  });

  test("normalizes database Date values before filtering and graphing", async () => {
    readTransactions.mockResolvedValue([
      { id: 3, type: "payment", date: new Date("2026-08-27T00:00:00Z"), amount: 12500, client_first_name: "Date", client_last_name: "Row", refund_subtype: null },
    ]);

    const result = await getReport({ date: "2026-08-27" });

    expect(result.turnover).toBe(12500);
    expect(result.transactions[0]?.date).toBe("2026-08-27");
    expect(result.graph.at(-1)).toEqual({ date: "2026-08-27", turnover: 12500 });
  });
});
