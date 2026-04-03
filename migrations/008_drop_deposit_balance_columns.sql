-- Drop stored deposit_paid and balance_amount columns from gigs.
-- These values are now computed at query time from line items and payments.
ALTER TABLE gigs DROP COLUMN IF EXISTS deposit_paid;
ALTER TABLE gigs DROP COLUMN IF EXISTS balance_amount;
