-- Remove any orphaned fee allocations that have no gig (no date, no business purpose).
DELETE FROM fee_allocations WHERE gig_id IS NULL;

-- Enforce that every fee allocation must belong to a gig.
ALTER TABLE fee_allocations ALTER COLUMN gig_id SET NOT NULL;
