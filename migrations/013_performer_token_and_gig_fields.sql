-- Add performer_token to people table
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS performer_token VARCHAR(255) UNIQUE;

-- Add 12 new event-detail fields to gigs table
ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS timings TEXT,
  ADD COLUMN IF NOT EXISTS contact_number TEXT,
  ADD COLUMN IF NOT EXISTS parking_info TEXT,
  ADD COLUMN IF NOT EXISTS client_notes TEXT,
  ADD COLUMN IF NOT EXISTS performer_notes TEXT,
  ADD COLUMN IF NOT EXISTS playlist_url TEXT,
  ADD COLUMN IF NOT EXISTS end_of_night_song TEXT,
  ADD COLUMN IF NOT EXISTS first_dance_song TEXT,
  ADD COLUMN IF NOT EXISTS first_dance_type TEXT,
  ADD COLUMN IF NOT EXISTS ceilidh BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ceilidh_length TEXT,
  ADD COLUMN IF NOT EXISTS ceilidh_style TEXT;
