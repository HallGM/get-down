-- Allow card charges to not be linked to any invoice (make invoice_id nullable)
ALTER TABLE invoice_card_charges ALTER COLUMN invoice_id DROP NOT NULL;
