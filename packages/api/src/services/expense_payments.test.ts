import { BadRequestError } from "../errors.js";
import { mapPayment, CreatePaymentSchema, assertShareTargets } from "./expense_payments.js";
import { calculateExpensePaymentMismatch } from "../utils/expensePayment.js";

describe("expense payment apportionment", () => {
  test("calculates signed payment allocation mismatches", () => {
    expect(calculateExpensePaymentMismatch(1200, 800)).toBe(400);
    expect(calculateExpensePaymentMismatch(-1200, -800)).toBe(-400);
    expect(calculateExpensePaymentMismatch(1200, 1200)).toBe(0);
  });

  test("accepts signed payment and share amounts without requiring a matching sum", () => {
    const input = CreatePaymentSchema.parse({ accountId: 1, amount: -1200, shares: [{ expenseId: 4, amount: -300 }] });
    expect(input.amount).toBe(-1200);
    expect(input.shares?.[0].amount).toBe(-300);
  });

  test("rejects structurally invalid share data", () => {
    expect(() => CreatePaymentSchema.parse({ accountId: 1, amount: 1200, shares: [{ expenseId: 0, amount: 200 }] })).toThrow();
  });

  test("maps standalone payment details and leaves shares independently empty", () => {
    expect(mapPayment({
      id: 17, account_id: 3, amount: -900, date: "2026-01-03", payment_method: "Cash", description: "Refund",
    })).toEqual({
      id: 17, accountId: 3, amount: -900, date: "2026-01-03", paymentMethod: "Cash", description: "Refund", shares: [],
    });
  });

  test("validates eligible targets and rejects tax-only or nonexistent expenses", () => {
    expect(() => assertShareTargets([{ expenseId: 8, amount: -300 }], [])).toThrow(BadRequestError);
    expect(() => assertShareTargets([{ expenseId: 8, amount: -300 }], [])).toThrow("One or more expenses do not exist");
    expect(() => assertShareTargets([{ expenseId: 8, amount: -300 }], [{ id: 8, description: "Tax only", is_tax_only: true }]))
      .toThrow("Tax-only expenses cannot receive payment shares");
    expect(() => assertShareTargets([{ expenseId: 8, amount: 10 }, { expenseId: 8, amount: 20 }], [{ id: 8, description: "Duplicate", is_tax_only: false }]))
      .toThrow("Each expense may only appear once in a payment");
  });
});
