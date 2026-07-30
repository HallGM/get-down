-- Add per-item discount percent to gig and invoice line items
ALTER TABLE gig_line_items ADD COLUMN discount_percent int NOT NULL DEFAULT 0;
ALTER TABLE invoice_line_items ADD COLUMN discount_percent int NOT NULL DEFAULT 0;
