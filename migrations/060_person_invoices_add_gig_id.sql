-- Add optional gig_id column to person_invoices
-- Links a person invoice to the gig it relates to (e.g. from a fee allocation)
-- Uses ON DELETE SET NULL so deleting a gig unlinks the invoice but preserves the historical record

ALTER TABLE person_invoices
ADD COLUMN gig_id int REFERENCES gigs(id) ON DELETE SET NULL;
