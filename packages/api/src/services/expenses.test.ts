import { describe, it, expect } from "@jest/globals";
import { mapExpense } from "./expenses.js";
import type { ExpenseRow } from "../repository/expenses.js";

describe("expenses service — tax-only expenses", () => {
  const baseRow: ExpenseRow = {
    id: 1,
    date: "2026-01-01",
    amount: 10000,
    description: "Test expense",
    category: "misc",
    recipient_name: "Test Recipient",
    airtable_id: null,
    document_key: null,
    is_tax_only: false,
  };

  it("should compute paymentStatus as 'paid' when amount is fully paid", () => {
    const expense = mapExpense(baseRow, [], [], 10000);
    expect(expense.paymentStatus).toBe("paid");
    expect(expense.isTaxOnly).toBe(false);
  });

  it("should compute paymentStatus as 'partial' when partially paid", () => {
    const expense = mapExpense(baseRow, [], [], 5000);
    expect(expense.paymentStatus).toBe("partial");
    expect(expense.isTaxOnly).toBe(false);
  });

  it("should compute paymentStatus as 'unpaid' when no payment made", () => {
    const expense = mapExpense(baseRow, [], [], 0);
    expect(expense.paymentStatus).toBe("unpaid");
    expect(expense.isTaxOnly).toBe(false);
  });

  it("should set paymentStatus to 'taxOnly' when is_tax_only is true, ignoring totalPaid", () => {
    const taxOnlyRow = { ...baseRow, is_tax_only: true };
    const expense = mapExpense(taxOnlyRow, [], [], 0);
    expect(expense.paymentStatus).toBe("taxOnly");
    expect(expense.isTaxOnly).toBe(true);
  });

  it("should set paymentStatus to 'taxOnly' even if totalPaid would normally compute a different status", () => {
    const taxOnlyRow = { ...baseRow, is_tax_only: true };
    // Even with 5000 paid, a tax-only expense should show as 'taxOnly'
    const expense = mapExpense(taxOnlyRow, [], [], 5000);
    expect(expense.paymentStatus).toBe("taxOnly");
    expect(expense.isTaxOnly).toBe(true);
  });

  it("should expose isTaxOnly field on expense object", () => {
    const expense = mapExpense(baseRow, [], [], 0);
    expect(expense.isTaxOnly).toBe(false);
    expect(typeof expense.isTaxOnly).toBe("boolean");
  });

  it("should expose isTaxOnly = true when is_tax_only column is true", () => {
    const taxOnlyRow = { ...baseRow, is_tax_only: true };
    const expense = mapExpense(taxOnlyRow, [], [], 0);
    expect(expense.isTaxOnly).toBe(true);
  });
});
