-- Link payments to a specific invoice (optional).
-- ON DELETE SET NULL: if an invoice is deleted, linked payments are
-- automatically unlinked rather than blocked or cascade-deleted.
ALTER TABLE payments
  ADD COLUMN invoice_id integer REFERENCES invoices(id) ON DELETE SET NULL;
