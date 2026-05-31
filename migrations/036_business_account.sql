-- Migration 036: Introduce business account and expense_payments table.
--
-- 1. Makes accounts.person_id nullable (business account has no person).
-- 2. Adds is_business boolean with a partial unique index so exactly one
--    business account can exist.
-- 3. Creates expense_payments table to record individual payments against
--    an expense (supports splits, staged payments, and refunds).
-- 4. Backfills existing paid_by_account_id + paid_date + amount data into
--    expense_payments before those columns are dropped in migration 037.
-- 5. Inserts the business account (seed.sql also does this idempotently).
--
-- Sign convention for expense_payments.amount:
--   positive = normal payment (money out of the paying account)
--   negative = refund (money coming back)

-- 1. Make person_id nullable
ALTER TABLE accounts ALTER COLUMN person_id DROP NOT NULL;

-- 2. Add is_business flag and enforce a single business account
ALTER TABLE accounts ADD COLUMN is_business boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX accounts_one_business ON accounts (is_business) WHERE is_business = true;

-- 3. Create expense_payments
CREATE TABLE expense_payments (
  id             serial       PRIMARY KEY,
  expense_id     int          NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  account_id     int          NOT NULL REFERENCES accounts(id),
  amount         int          NOT NULL,
  date           date,
  payment_method varchar(100),
  description    varchar(255)
);

-- 4. Backfill from expenses.paid_by_account_id / paid_date
--    Each expense that had a paid_by_account_id gets one payment row
--    using the expense amount, date from paid_date (or expense date), and
--    the existing payment_method.
INSERT INTO expense_payments (expense_id, account_id, amount, date, payment_method)
SELECT
  id,
  paid_by_account_id,
  amount,
  COALESCE(paid_date, date),
  payment_method
FROM expenses
WHERE paid_by_account_id IS NOT NULL;

-- 5. Insert business account (also done by seed.sql for idempotency)
INSERT INTO accounts (is_business) VALUES (true)
ON CONFLICT (is_business) WHERE is_business = true DO NOTHING;

-- 6. Backfill business-paid expenses.
--    An expense with no paid_by_account_id but a paid_date was paid by the
--    business. Create a single payment record against the business account.
--    Expenses with neither field are genuinely unpaid — no record created.
INSERT INTO expense_payments (expense_id, account_id, amount, date, payment_method)
SELECT
  e.id,
  a.id,
  e.amount,
  e.paid_date,
  e.payment_method
FROM expenses e
CROSS JOIN accounts a
WHERE e.paid_by_account_id IS NULL
  AND e.paid_date IS NOT NULL
  AND a.is_business = true;
