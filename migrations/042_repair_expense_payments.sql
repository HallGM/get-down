-- Migration 042: Repair expense_payments.expense_id for stale local databases.
--
-- If a local database was created from an older version of migration 036 that
-- did not yet include the expense_id column, the column will be missing and
-- every query against expense_payments will fail with "column does not exist".
--
-- This migration detects the missing column and adds it. Existing rows (if any)
-- cannot be reconciled without the FK link, so they are cleared first. On a
-- fresh database this block is a no-op because the column already exists.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name  = 'expense_payments'
      AND column_name = 'expense_id'
  ) THEN
    -- Rows without expense_id cannot be linked to an expense; clear them.
    DELETE FROM expense_payments;

    ALTER TABLE expense_payments
      ADD COLUMN expense_id int NOT NULL
        REFERENCES expenses(id) ON DELETE CASCADE;
  END IF;
END $$;
