-- Sequential invoice numbering per year (e.g. 26-001)
CREATE TABLE IF NOT EXISTS invoice_sequences (
  year     VARCHAR(2) PRIMARY KEY,
  next_seq INTEGER    NOT NULL DEFAULT 1
);

-- Seed from existing invoices whose numbers start with a 2-digit year prefix
INSERT INTO invoice_sequences (year, next_seq)
SELECT
  SUBSTRING(invoice_number, 1, 2) AS year,
  COUNT(*) + 1                    AS next_seq
FROM invoices
WHERE invoice_number ~ '^\d{2}-'
GROUP BY SUBSTRING(invoice_number, 1, 2)
ON CONFLICT (year) DO UPDATE SET next_seq = EXCLUDED.next_seq;
