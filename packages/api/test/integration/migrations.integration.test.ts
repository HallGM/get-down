/**
 * Integration tests for migration 061: Delete orphaned expense payments.
 *
 * Verifies that:
 * 1. The migration successfully identifies orphaned payments
 * 2. Orphaned payments are deleted
 * 3. Normal (linked) payments are preserved
 * 4. The FK constraint is verified and in place
 * 5. After migration, it's impossible to create orphans (FK prevents it)
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

describe("Migration 061 — Delete orphaned expense payments", () => {
  async function createExpensePayment(expenseId: number, amount: number) {
    const result = await pool.query(
      "INSERT INTO expense_payments (expense_id, account_id, amount, date) VALUES ($1, (SELECT id FROM accounts WHERE is_business LIMIT 1), $2, now()) RETURNING id",
      [expenseId, amount]
    );
    return result.rows[0].id;
  }

  async function getOrphanedPayments() {
    const result = await pool.query(
      "SELECT ep.id, ep.expense_id, ep.amount FROM expense_payments ep LEFT JOIN expenses e ON e.id = ep.expense_id WHERE e.id IS NULL"
    );
    return result.rows;
  }

  async function countPayments() {
    const result = await pool.query("SELECT COUNT(*) as count FROM expense_payments");
    return parseInt(result.rows[0].count, 10);
  }

  test("migration deletes orphaned payments and preserves linked ones", async () => {
    // Create linked payment (should survive)
    const linkedExpense = await fixtures.makeExpense({ amount: 50000, description: "Linked" });
    const linkedPaymentId = await createExpensePayment(linkedExpense.id, 25000);

    // Create orphaned payment by disabling triggers
    const orphanedExpense = await fixtures.makeExpense({ amount: 30000, description: "Will be deleted" });
    const orphanedPaymentId = await createExpensePayment(orphanedExpense.id, 20000);

    // Verify both exist before migration
    let orphans = await getOrphanedPayments();
    expect(orphans).toHaveLength(0); // None orphaned yet (expense still exists)

    // Simulate orphaning by deleting the expense without cascade
    await pool.query("ALTER TABLE expenses DISABLE TRIGGER ALL");
    try {
      await pool.query("DELETE FROM expenses WHERE id = $1", [orphanedExpense.id]);
    } finally {
      await pool.query("ALTER TABLE expenses ENABLE TRIGGER ALL");
    }

    // Verify orphan was created
    orphans = await getOrphanedPayments();
    expect(orphans).toHaveLength(1);
    expect(orphans[0].id).toBe(orphanedPaymentId);

    const countBefore = await countPayments();
    expect(countBefore).toBe(2); // Both still in DB

    // Run migration 061 manually
    await pool.query(`
      DELETE FROM expense_payments
      WHERE NOT EXISTS (
        SELECT 1 FROM expenses WHERE expenses.id = expense_payments.expense_id
      )
    `);

    // Verify orphan was deleted, linked payment survives
    const countAfter = await countPayments();
    expect(countAfter).toBe(1);

    orphans = await getOrphanedPayments();
    expect(orphans).toHaveLength(0);

    // Verify the linked payment still exists
    const linkedPayment = await pool.query(
      "SELECT id FROM expense_payments WHERE id = $1",
      [linkedPaymentId]
    );
    expect(linkedPayment.rows).toHaveLength(1);
  });

  test("FK constraint is in place and prevents new orphans", async () => {
    // Verify the constraint exists
    const constraint = await pool.query(
      "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'expense_payments' AND constraint_type = 'FOREIGN KEY'"
    );
    expect(constraint.rows.length).toBeGreaterThan(0);
    expect(constraint.rows.some((r) => r.constraint_name === "expense_payments_expense_id_fkey")).toBe(true);

    // Try to create a payment referencing a non-existent expense (should fail)
    const nonExistentId = 999999;
    await expect(
      pool.query(
        "INSERT INTO expense_payments (expense_id, account_id, amount, date) VALUES ($1, (SELECT id FROM accounts WHERE is_business LIMIT 1), 1000, now())",
        [nonExistentId]
      )
    ).rejects.toThrow(/violates foreign key constraint/);
  });

  test("no orphaned payments exist after migration", async () => {
    // Create several valid expenses with payments
    const exp1 = await fixtures.makeExpense({ amount: 10000, description: "Exp 1" });
    const exp2 = await fixtures.makeExpense({ amount: 20000, description: "Exp 2" });
    const exp3 = await fixtures.makeExpense({ amount: 30000, description: "Exp 3" });

    await createExpensePayment(exp1.id, 5000);
    await createExpensePayment(exp2.id, 15000);
    await createExpensePayment(exp3.id, 25000);

    // Verify no orphans exist
    let orphans = await getOrphanedPayments();
    expect(orphans).toHaveLength(0);

    // After migration, still no orphans
    await pool.query(`
      DELETE FROM expense_payments
      WHERE NOT EXISTS (
        SELECT 1 FROM expenses WHERE expenses.id = expense_payments.expense_id
      )
    `);

    orphans = await getOrphanedPayments();
    expect(orphans).toHaveLength(0);

    // All linked payments remain
    const count = await countPayments();
    expect(count).toBe(3);
  });
});
