-- Migration 037: Drop old paid_by / paid_date columns from expenses and
-- replace account_ledger Arm 3 to read from expense_payments.
--
-- Must run after 036 (which created expense_payments and backfilled data).

-- Drop the view first — it references paid_by_account_id, which blocks the column drop.
-- It is fully replaced at the end of this migration.
DROP VIEW IF EXISTS account_ledger;

-- Drop old columns now that data has been migrated
ALTER TABLE expenses DROP COLUMN IF EXISTS paid_by_account_id;
ALTER TABLE expenses DROP COLUMN IF EXISTS paid_date;
ALTER TABLE expenses DROP COLUMN IF EXISTS payment_method;

-- Replace account_ledger view.
--
-- Sign convention (unchanged from migration 029):
--   positive amount = money taken out / owed by the account holder
--   negative amount = money owed to / earned by the account holder
--
-- Arm 1: manual account_transactions
--   Covers both partner accounts and the business account.
--
-- Arm 2: fee allocations (partner accounts only, unchanged)
--
-- Arm 3: expense_payments
--   Partner account: -ep.amount  (positive payment = credit to partner;
--                                  negative refund = reduces credit)
--   Business account: +ep.amount (positive payment = debit/money out;
--                                  negative refund = credit/money in)

CREATE OR REPLACE VIEW account_ledger AS

  -- Arm 1: actual money movements recorded as account transactions
  SELECT
    at.id          AS source_id,
    'transaction'  AS entry_type,
    a.id           AS account_id,
    a.person_id,
    at.date,
    at.amount,
    at.type        AS label,
    at.description
  FROM account_transactions at
  JOIN accounts a ON a.id = at.account_id
  LEFT JOIN people p ON p.id = a.person_id
  WHERE a.is_business = true OR p.is_partner = true

  UNION ALL

  -- Arm 2: fee allocations treated as earned credits (negative = owed to partner)
  SELECT
    fa.id                                                                                 AS source_id,
    'allocation'                                                                          AS entry_type,
    a.id                                                                                  AS account_id,
    a.person_id,
    g.date,
    (-COALESCE(SUM(li.amount), 0))::int                                                   AS amount,
    'Fee Allocation'                                                                      AS label,
    COALESCE(g.name, g.first_name || ' ' || g.last_name)
      || ' - ' || TO_CHAR(g.date, 'DD Mon YYYY')                                         AS description
  FROM fee_allocations fa
  JOIN accounts  a  ON a.person_id    = fa.person_id
  JOIN people    p  ON p.id           = fa.person_id
  JOIN gigs      g  ON g.id           = fa.gig_id
  LEFT JOIN fee_allocation_line_items li ON li.allocation_id = fa.id
  WHERE p.is_partner = true
  GROUP BY fa.id, a.id, a.person_id, g.date, g.name, g.first_name, g.last_name

  UNION ALL

  -- Arm 3: expense payments
  --   Partners get a credit (-ep.amount); business gets a debit (+ep.amount).
  SELECT
    ep.id                                                               AS source_id,
    'expense_payment'                                                   AS entry_type,
    a.id                                                                AS account_id,
    a.person_id,
    ep.date,
    CASE WHEN a.is_business THEN ep.amount ELSE -ep.amount END::int    AS amount,
    'Expense'                                                           AS label,
    e.description
  FROM expense_payments ep
  JOIN accounts a ON a.id  = ep.account_id
  JOIN expenses e ON e.id  = ep.expense_id
  LEFT JOIN people p ON p.id = a.person_id
  WHERE a.is_business = true OR p.is_partner = true;
