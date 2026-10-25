-- Store expense allocations separately from payment/account-ledger movements.
CREATE TABLE expense_payment_shares (
  payment_id int NOT NULL REFERENCES expense_payments(id) ON DELETE CASCADE,
  expense_id int NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  amount int NOT NULL,
  PRIMARY KEY (payment_id, expense_id)
);

INSERT INTO expense_payment_shares (payment_id, expense_id, amount)
SELECT id, expense_id, amount FROM expense_payments;

DROP VIEW account_ledger;
ALTER TABLE expense_payments DROP CONSTRAINT expense_payments_expense_id_fkey;
ALTER TABLE expense_payments DROP COLUMN expense_id;

-- Keep one ledger movement per payment. Shares only affect expense totals and
-- are not cash movements. A shared-payment description lists covered expenses.
CREATE OR REPLACE VIEW account_ledger AS
  SELECT at.id AS source_id, 'transaction' AS entry_type, a.id AS account_id, a.person_id,
    at.date, at.amount, at.type AS label, at.description
  FROM account_transactions at
  JOIN accounts a ON a.id = at.account_id
  LEFT JOIN people p ON p.id = a.person_id
  WHERE a.is_business = true OR p.is_partner = true

  UNION ALL

  SELECT fa.id AS source_id, 'allocation' AS entry_type, a.id AS account_id, a.person_id,
    g.date, (-COALESCE(SUM(li.amount), 0))::int AS amount, 'Fee Allocation' AS label,
    COALESCE(g.name, g.first_name || ' ' || g.last_name) || ' - ' || TO_CHAR(g.date, 'DD Mon YYYY') AS description
  FROM fee_allocations fa
  JOIN accounts a ON a.person_id = fa.person_id
  JOIN people p ON p.id = fa.person_id
  JOIN gigs g ON g.id = fa.gig_id
  LEFT JOIN fee_allocation_line_items li ON li.allocation_id = fa.id
  WHERE p.is_partner = true
  GROUP BY fa.id, a.id, a.person_id, g.date, g.name, g.first_name, g.last_name

  UNION ALL

  SELECT ep.id AS source_id, 'expense_payment' AS entry_type, a.id AS account_id, a.person_id,
    ep.date, CASE WHEN a.is_business THEN ep.amount ELSE -ep.amount END::int AS amount,
    'Expense' AS label,
    COALESCE(string_agg(DISTINCT e.description, ', ' ORDER BY e.description), ep.description) AS description
  FROM expense_payments ep
  JOIN accounts a ON a.id = ep.account_id
  LEFT JOIN people p ON p.id = a.person_id
  LEFT JOIN expense_payment_shares s ON s.payment_id = ep.id
  LEFT JOIN expenses e ON e.id = s.expense_id
  WHERE a.is_business = true OR p.is_partner = true
  GROUP BY ep.id, a.id, a.person_id

  UNION ALL

  SELECT py.id, 'gig_payment', ba.id, NULL::int, py.date, (-py.amount)::int, 'Gig Payment',
    COALESCE(g.name, g.first_name || ' ' || g.last_name) || ' - ' || TO_CHAR(g.date, 'DD Mon YYYY')
  FROM payments py JOIN gigs g ON g.id = py.gig_id
  CROSS JOIN (SELECT id FROM accounts WHERE is_business = true LIMIT 1) ba

  UNION ALL

  SELECT at.id, 'drawing', ba.id, NULL::int, at.date, at.amount::int, 'Drawing', at.description
  FROM account_transactions at
  JOIN accounts pa ON pa.id = at.account_id
  JOIN people p ON p.id = pa.person_id
  CROSS JOIN (SELECT id FROM accounts WHERE is_business = true LIMIT 1) ba
  WHERE p.is_partner = true AND at.type = 'drawing'

  UNION ALL

  SELECT py.id, 'received_gig_payment', a.id, a.person_id, py.date, py.amount::int, 'Gig Payment',
    COALESCE(g.name, g.first_name || ' ' || g.last_name) || ' - ' || TO_CHAR(g.date, 'DD Mon YYYY')
  FROM payments py
  JOIN gigs g ON g.id = py.gig_id
  JOIN accounts a ON a.id = py.received_by_account_id
  JOIN people p ON p.id = a.person_id
  WHERE p.is_partner = true;
