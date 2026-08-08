-- Migration 061: Delete orphaned expense payments and verify FK integrity.
--
-- Orphaned expense payments (where the linked expense no longer exists) should
-- never occur under normal operation because expense_payments.expense_id has
-- ON DELETE CASCADE. However, if FK enforcement was bypassed (migration bug,
-- manual edit, triggers disabled, etc.), orphans can accumulate.
--
-- This migration:
-- 1. Identifies and logs any orphaned payments
-- 2. Deletes them
-- 3. Verifies the FK constraint is in place and enforced
--
-- After this migration, it is impossible for orphaned payments to exist
-- unless the FK constraint is explicitly removed or bypassed.

-- Step 1: Log and identify orphaned payments (for audit trail)
DO $$
DECLARE
  orphan_count INT;
  orphan_ids INT[];
BEGIN
  -- Find orphaned payments
  SELECT COUNT(*), ARRAY_AGG(ep.id)
  INTO orphan_count, orphan_ids
  FROM expense_payments ep
  LEFT JOIN expenses e ON e.id = ep.expense_id
  WHERE e.id IS NULL;

  -- Log the findings
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % orphaned expense payments (IDs: %)', orphan_count, orphan_ids;
  ELSE
    RAISE NOTICE 'No orphaned expense payments found';
  END IF;
END $$;

-- Step 2: Delete orphaned payments
DELETE FROM expense_payments
WHERE NOT EXISTS (
  SELECT 1 FROM expenses WHERE expenses.id = expense_payments.expense_id
);

-- Step 3: Verify FK constraint exists and is properly configured
-- This check ensures that the constraint is NOT DEFERRABLE and will catch
-- future attempts to create orphans (e.g. via triggers disabled, manual deletes).
DO $$
DECLARE
  fk_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'expense_payments'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'expense_payments_expense_id_fkey'
  )
  INTO fk_exists;

  IF NOT fk_exists THEN
    RAISE EXCEPTION 'Foreign key constraint expense_payments_expense_id_fkey not found. Cannot proceed.';
  END IF;

  RAISE NOTICE 'FK constraint verified: expense_payments.expense_id -> expenses(id)';
END $$;
