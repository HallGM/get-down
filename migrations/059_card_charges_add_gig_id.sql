-- Add gig_id to invoice_card_charges table
-- This allows us to track which gig a card charge belongs to, even if it's not linked to an invoice

ALTER TABLE invoice_card_charges 
ADD COLUMN gig_id INT;

-- Populate gig_id from the linked invoice for existing charges
UPDATE invoice_card_charges icc
SET gig_id = inv.gig_id
FROM invoices inv
WHERE icc.invoice_id = inv.id;

-- Add NOT NULL constraint
ALTER TABLE invoice_card_charges 
ALTER COLUMN gig_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE invoice_card_charges
ADD CONSTRAINT fk_invoice_card_charges_gig_id 
FOREIGN KEY (gig_id) REFERENCES gigs(id);
