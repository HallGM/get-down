-- Add invoice_type column to invoices table.
-- 'deposit' invoices show amount due as deposit (20%) minus payments made.
-- 'balance' invoices show amount due as full total minus payments made.
-- All existing rows default to 'balance' (preserves current behaviour).
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(20) NOT NULL DEFAULT 'balance'
    CHECK (invoice_type IN ('deposit', 'balance'));
