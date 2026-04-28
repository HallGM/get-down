-- Add client form fields to gigs table
ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS client_token  uuid        UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS meal_details  text,
  ADD COLUMN IF NOT EXISTS form_saved_at timestamptz;

-- Backfill client_token for any existing rows where it ended up NULL
-- (should not happen with DEFAULT, but guard anyway)
UPDATE gigs SET client_token = gen_random_uuid() WHERE client_token IS NULL;

-- Now enforce NOT NULL
ALTER TABLE gigs ALTER COLUMN client_token SET NOT NULL;
