-- Migration 046: Add optional received_by_account_id to payments and wire it
-- into the account_ledger view.
--
-- When received_by_account_id is NULL (the default) a payment is treated as
-- received by the business — identical to the existing behaviour.
--
-- When received_by_account_id points at a partner account the payment still
-- appears on the business account as income (Arm 4, unchanged), AND a new
-- positive/debit entry appears on the partner's account (Arm 6) indicating
-- they are holding the cash.
--
-- Sign convention (unchanged):
--   positive amount = money out / owed by the account holder
--   negative amount = money in / earned by the account holder

ALTER TABLE payments
  ADD COLUMN received_by_account_id int REFERENCES accounts(id);

-- Replace account_ledger view.  All five arms from migration 038 are
-- reproduced verbatim; Arm 6 is appended at the end.

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
  WHERE a.is_business = true OR p.is_partner = true

  UNION ALL

  -- Arm 4: gig payments received from clients → business account income (negative = money in)
  SELECT
    py.id                                                               AS source_id,
    'gig_payment'                                                       AS entry_type,
    ba.id                                                               AS account_id,
    NULL::int                                                           AS person_id,
    py.date,
    (-py.amount)::int                                                   AS amount,
    'Gig Payment'                                                       AS label,
    COALESCE(g.name, g.first_name || ' ' || g.last_name)
      || ' - ' || TO_CHAR(g.date, 'DD Mon YYYY')                       AS description
  FROM payments py
  JOIN gigs g ON g.id = py.gig_id
  CROSS JOIN (SELECT id FROM accounts WHERE is_business = true LIMIT 1) ba

  UNION ALL

  -- Arm 5: partner drawings → business account outgoing (positive = money out)
  --   The partner-side debit is already captured in Arm 1 via account_transactions.
  --   This arm surfaces the same transaction on the business account.
  SELECT
    at.id                                                               AS source_id,
    'drawing'                                                           AS entry_type,
    ba.id                                                               AS account_id,
    NULL::int                                                           AS person_id,
    at.date,
    at.amount::int                                                      AS amount,
    'Drawing'                                                           AS label,
    at.description
  FROM account_transactions at
  JOIN accounts pa ON pa.id = at.account_id
  JOIN people p    ON p.id  = pa.person_id
  CROSS JOIN (SELECT id FROM accounts WHERE is_business = true LIMIT 1) ba
  WHERE p.is_partner = true
    AND at.type = 'drawing'

  UNION ALL

  -- Arm 6: gig payments received directly by a partner → partner debit (+amount)
  --   The business income entry is already captured in Arm 4 above.
  --   This arm records that the partner is holding the cash on the business's behalf,
  --   which reduces what the business owes them.
  SELECT
    py.id                                                               AS source_id,
    'received_gig_payment'                                              AS entry_type,
    a.id                                                                AS account_id,
    a.person_id,
    py.date,
    py.amount::int                                                      AS amount,
    'Gig Payment'                                                       AS label,
    COALESCE(g.name, g.first_name || ' ' || g.last_name)
      || ' - ' || TO_CHAR(g.date, 'DD Mon YYYY')                       AS description
  FROM payments py
  JOIN gigs     g ON g.id = py.gig_id
  JOIN accounts a ON a.id = py.received_by_account_id
  JOIN people   p ON p.id = a.person_id
  WHERE p.is_partner = true;
