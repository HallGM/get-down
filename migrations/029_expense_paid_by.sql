-- Add paid_by_account_id to expenses and update the account_ledger view to
-- include a third arm crediting expenses paid by a partner from their own pocket.

ALTER TABLE expenses
  ADD COLUMN paid_by_account_id int REFERENCES accounts(id);

-- Replace the account_ledger view with an updated version that adds Arm 3.
-- Sign convention (unchanged):
--   positive amount = money taken out by the person (drawing)
--   negative amount = money owed to / earned by the person (credit)
--
-- Arm 3 emits (-expense.amount) so the partner is credited for what they paid.

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
  JOIN people   p ON p.id = a.person_id
  WHERE p.is_partner = true

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

  -- Arm 3: expenses paid out of pocket by a partner (negative = credit to partner)
  SELECT
    e.id                  AS source_id,
    'expense'             AS entry_type,
    a.id                  AS account_id,
    a.person_id,
    e.date,
    (-e.amount)::int      AS amount,
    'Expense'             AS label,
    e.description
  FROM expenses e
  JOIN accounts a ON a.id  = e.paid_by_account_id
  JOIN people   p ON p.id  = a.person_id
  WHERE p.is_partner = true;
