ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS private_notes text;
