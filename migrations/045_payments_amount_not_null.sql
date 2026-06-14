-- Enforce that every payment record has an amount.
-- The application has always required amount on create/update,
-- so no existing rows should have a NULL value here.
ALTER TABLE payments ALTER COLUMN amount SET NOT NULL;
