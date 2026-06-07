-- Migration 044: rename raw type code to human-readable label.
--
-- The backfill_scott_payments script previously stored transactions using the
-- snake_case code 'client_payment_received'. This update renames all existing
-- rows to the human-readable 'Client Payment Received' so they display
-- correctly in the ledger view and can be reproduced via the transaction form.

UPDATE account_transactions
SET type = 'Client Payment Received'
WHERE type = 'client_payment_received';
