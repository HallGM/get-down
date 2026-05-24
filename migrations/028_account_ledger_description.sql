-- Update account_ledger view: replace fa.notes with an auto-generated description
-- for allocation entries: "{gig name or client name} — {gig date}"

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
      || ' — ' || TO_CHAR(g.date, 'DD Mon YYYY')                                         AS description
  FROM fee_allocations fa
  JOIN accounts  a  ON a.person_id    = fa.person_id
  JOIN people    p  ON p.id           = fa.person_id
  JOIN gigs      g  ON g.id           = fa.gig_id
  LEFT JOIN fee_allocation_line_items li ON li.allocation_id = fa.id
  WHERE p.is_partner = true
  GROUP BY fa.id, a.id, a.person_id, g.date, g.name, g.first_name, g.last_name;
