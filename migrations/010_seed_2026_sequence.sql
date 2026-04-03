-- Seed the 2026 invoice sequence at 149.
-- The first 148 invoices were issued in a legacy system; starting here at 149
-- ensures no collision with those records.
-- Safe to re-run: GREATEST() ensures the counter is never lowered.
INSERT INTO invoice_sequences (year, next_seq)
VALUES ('26', 149)
ON CONFLICT (year) DO UPDATE
  SET next_seq = GREATEST(invoice_sequences.next_seq, 149);
