-- fee_allocations.gig_id is now optional: showcase fee allocations have no gig
ALTER TABLE fee_allocations ALTER COLUMN gig_id DROP NOT NULL;
