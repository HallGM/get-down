-- Reclassify historical refunds that represent debt forgiveness (write-offs) from 'credit' to 'write_off'.
-- Per conversation, the Stephanie Wilson gig (first_name='Stephanie', last_name='Wilson', date='2025-11-01')
-- has a 16p refund with description containing "Card Payment Adjustment" or "goodwill gesture" that should
-- be a write-off. Find by matching both the gig and refund attributes to ensure accuracy.

UPDATE refunds
SET subtype = 'write_off'
WHERE gig_id = (
  SELECT id FROM gigs WHERE first_name = 'Stephanie' AND last_name = 'Wilson' LIMIT 1
)
  AND amount = 16
  AND subtype = 'credit'
  AND (description ILIKE '%goodwill%' OR description ILIKE '%card payment adjustment%');
