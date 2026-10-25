/**
 * Regression coverage for migration 061's orphan cleanup and FK guarantees,
 * plus schema/accounting coverage for the later expense-payment-share model.
 * Migration 072 removes expense_payments.expense_id, so the legacy 061 checks
 * run against isolated temporary tables that reproduce the pre-072 schema.
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
afterAll(async () => stopDatabase());
beforeEach(async () => resetDatabase(pool));

describe("Migration 061: Delete orphaned expense payments", () => {
  test("migration deletes orphaned payments and preserves linked ones", async () => {
    const client = await pool.connect();
    try {
      await createLegacyTables(client);
      await client.query("INSERT INTO legacy_expenses (id) VALUES (1), (2)");
      const linked = await client.query<{ id: number }>(
        "INSERT INTO legacy_expense_payments (expense_id, amount) VALUES (1, 25000) RETURNING id",
      );
      const orphaned = await client.query<{ id: number }>(
        "INSERT INTO legacy_expense_payments (expense_id, amount) VALUES (2, 20000) RETURNING id",
      );

      await client.query("DELETE FROM legacy_expenses WHERE id = 2");
      const orphansBefore = await client.query(
        "SELECT ep.id FROM legacy_expense_payments ep LEFT JOIN legacy_expenses e ON e.id = ep.expense_id WHERE e.id IS NULL",
      );
      expect(orphansBefore.rows).toHaveLength(1);
      expect(orphansBefore.rows[0].id).toBe(orphaned.rows[0].id);
      expect((await client.query("SELECT COUNT(*)::int AS count FROM legacy_expense_payments")).rows[0].count).toBe(2);

      await client.query(`
        DELETE FROM legacy_expense_payments
        WHERE NOT EXISTS (
          SELECT 1 FROM legacy_expenses WHERE legacy_expenses.id = legacy_expense_payments.expense_id
        )
      `);

      const orphansAfter = await client.query(
        "SELECT ep.id FROM legacy_expense_payments ep LEFT JOIN legacy_expenses e ON e.id = ep.expense_id WHERE e.id IS NULL",
      );
      expect(orphansAfter.rows).toHaveLength(0);
      expect((await client.query("SELECT COUNT(*)::int AS count FROM legacy_expense_payments")).rows[0].count).toBe(1);
      expect((await client.query("SELECT id FROM legacy_expense_payments WHERE id = $1", [linked.rows[0].id])).rows).toHaveLength(1);
    } finally {
      client.release();
    }
  });

  test("FK constraint is in place and prevents new orphans", async () => {
    const client = await pool.connect();
    try {
      await createLegacyTables(client, true);
      const constraint = await client.query(
        "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'legacy_expense_payments' AND constraint_type = 'FOREIGN KEY'",
      );
      expect(constraint.rows.length).toBeGreaterThan(0);
      expect(constraint.rows.some((row) => row.constraint_name === "expense_payments_expense_id_fkey")).toBe(true);

      await expect(
        client.query("INSERT INTO legacy_expense_payments (expense_id, amount) VALUES (999999, 1000)"),
      ).rejects.toThrow(/violates foreign key constraint/);
    } finally {
      client.release();
    }
  });

  test("no orphaned payments exist after migration", async () => {
    const client = await pool.connect();
    try {
      await createLegacyTables(client);
      await client.query("INSERT INTO legacy_expenses (id) VALUES (1), (2), (3)");
      await client.query(
        "INSERT INTO legacy_expense_payments (expense_id, amount) VALUES (1, 5000), (2, 15000), (3, 25000)",
      );

      const orphansBefore = await client.query(
        "SELECT ep.id FROM legacy_expense_payments ep LEFT JOIN legacy_expenses e ON e.id = ep.expense_id WHERE e.id IS NULL",
      );
      expect(orphansBefore.rows).toHaveLength(0);

      await client.query(`
        DELETE FROM legacy_expense_payments
        WHERE NOT EXISTS (
          SELECT 1 FROM legacy_expenses WHERE legacy_expenses.id = legacy_expense_payments.expense_id
        )
      `);

      const orphansAfter = await client.query(
        "SELECT ep.id FROM legacy_expense_payments ep LEFT JOIN legacy_expenses e ON e.id = ep.expense_id WHERE e.id IS NULL",
      );
      expect(orphansAfter.rows).toHaveLength(0);
      expect((await client.query("SELECT COUNT(*)::int AS count FROM legacy_expense_payments")).rows[0].count).toBe(3);
    } finally {
      client.release();
    }
  });
});

describe("expense payment shares schema", () => {
  test("a payment survives deletion of one share target and cascades when payment is deleted", async () => {
    const expenseA = await fixtures.makeExpense({ description: "Share target A" });
    const expenseB = await fixtures.makeExpense({ description: "Share target B" });
    const inserted = await pool.query<{ id: number }>(
      "INSERT INTO expense_payments (account_id, amount) VALUES ((SELECT id FROM accounts WHERE is_business LIMIT 1), 10000) RETURNING id",
    );
    const paymentId = inserted.rows[0].id;
    await pool.query("INSERT INTO expense_payment_shares (payment_id, expense_id, amount) VALUES ($1, $2, $3), ($1, $4, $5)", [paymentId, expenseA.id, 4000, expenseB.id, 6000]);

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseA.id]);
    const survivors = await pool.query("SELECT * FROM expense_payments WHERE id = $1", [paymentId]);
    expect(survivors.rows).toHaveLength(1);
    const shares = await pool.query("SELECT expense_id, amount FROM expense_payment_shares WHERE payment_id = $1", [paymentId]);
    expect(shares.rows).toEqual([{ expense_id: expenseB.id, amount: 6000 }]);

    await pool.query("DELETE FROM expense_payments WHERE id = $1", [paymentId]);
    expect((await pool.query("SELECT * FROM expense_payment_shares WHERE payment_id = $1", [paymentId])).rows).toHaveLength(0);
  });

  test("migrated payments preserve IDs, amounts and a matching share", async () => {
    const expense = await fixtures.makeExpense({ description: "Migrated share target" });
    const inserted = await pool.query<{ id: number }>(
      "INSERT INTO expense_payments (account_id, amount) VALUES ((SELECT id FROM accounts WHERE is_business LIMIT 1), 8200) RETURNING id",
    );
    const paymentId = inserted.rows[0].id;
    await pool.query(
      "INSERT INTO expense_payment_shares (payment_id, expense_id, amount) VALUES ($1, $2, $3)",
      [paymentId, expense.id, 8200],
    );

    const migrated = await pool.query<{ id: number; amount: number; assigned: number }>(
      "SELECT ep.id, ep.amount, COALESCE(SUM(s.amount), 0)::int AS assigned FROM expense_payments ep LEFT JOIN expense_payment_shares s ON s.payment_id = ep.id WHERE ep.id = $1 GROUP BY ep.id",
      [paymentId],
    );
    expect(migrated.rows).toEqual([{ id: paymentId, amount: 8200, assigned: 8200 }]);
  });

  test("account ledger records each shared payment once, regardless of share count", async () => {
    const expenseA = await fixtures.makeExpense({ description: "Ledger share A" });
    const expenseB = await fixtures.makeExpense({ description: "Ledger share B" });
    const inserted = await pool.query<{ id: number }>(
      "INSERT INTO expense_payments (account_id, amount) VALUES ((SELECT id FROM accounts WHERE is_business LIMIT 1), 7000) RETURNING id",
    );
    const paymentId = inserted.rows[0].id;
    await pool.query("INSERT INTO expense_payment_shares (payment_id, expense_id, amount) VALUES ($1, $2, 2000), ($1, $3, 5000)", [paymentId, expenseA.id, expenseB.id]);
    const ledger = await pool.query("SELECT source_id, amount, description FROM account_ledger WHERE entry_type = 'expense_payment' AND source_id = $1", [paymentId]);
    expect(ledger.rows).toHaveLength(1);
    expect(ledger.rows[0].amount).toBe(7000);
    expect(ledger.rows[0].description).toContain("Ledger share A");
    expect(ledger.rows[0].description).toContain("Ledger share B");
  });
});

async function createLegacyTables(client: import("pg").PoolClient, withForeignKey = false): Promise<void> {
  await client.query("DROP TABLE IF EXISTS pg_temp.legacy_expense_payments, pg_temp.legacy_expenses");
  await client.query("CREATE TEMP TABLE legacy_expenses (id integer PRIMARY KEY)");
  await client.query(`
    CREATE TEMP TABLE legacy_expense_payments (
      id serial PRIMARY KEY,
      expense_id integer NOT NULL,
      amount integer NOT NULL
      ${withForeignKey ? ", CONSTRAINT expense_payments_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES legacy_expenses(id)" : ""}
    )
  `);
}
