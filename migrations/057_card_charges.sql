-- Migration 057: Rename invoice_additional_charges to invoice_card_charges
-- and link each charge to an automatically-created "Processing fees" expense.

-- Step 1: Rename table
ALTER TABLE invoice_additional_charges RENAME TO invoice_card_charges;

-- Step 2: Add expense_id column (nullable initially for backfill)
ALTER TABLE invoice_card_charges ADD COLUMN expense_id int REFERENCES expenses(id) ON DELETE RESTRICT;

-- Step 3: Backfill expenses
-- For each existing card charge, create a linked "Processing fees" expense.
-- Use PL/pgSQL block to loop and get each new expense id.
DO $$
DECLARE
  charge_row RECORD;
  new_expense_id int;
  expense_date date;
BEGIN
  FOR charge_row IN
    SELECT icc.id, icc.invoice_id, icc.description, icc.amount, inv.date
    FROM invoice_card_charges icc
    JOIN invoices inv ON inv.id = icc.invoice_id
    WHERE icc.expense_id IS NULL
  LOOP
    -- Use invoice date as the expense date, or today if missing
    expense_date := charge_row.date;
    IF expense_date IS NULL THEN
      expense_date := CURRENT_DATE;
    END IF;

    -- Insert the linked expense (amount defaults to 0 if the legacy charge
    -- had no amount recorded, since expenses.amount is NOT NULL)
    INSERT INTO expenses (date, amount, description, category)
    VALUES (
      expense_date,
      COALESCE(charge_row.amount, 0),
      COALESCE(charge_row.description, 'Card charge'),
      'Processing fees'
    )
    RETURNING id INTO new_expense_id;

    -- Link the charge to the expense
    UPDATE invoice_card_charges
    SET expense_id = new_expense_id
    WHERE id = charge_row.id;
  END LOOP;
END $$;

-- Step 4: Make expense_id NOT NULL and add unique constraint
ALTER TABLE invoice_card_charges ALTER COLUMN expense_id SET NOT NULL;
ALTER TABLE invoice_card_charges ADD CONSTRAINT invoice_card_charges_expense_id_unique UNIQUE (expense_id);
