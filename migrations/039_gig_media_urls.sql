-- Add media delivery columns to gigs
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS vimeo_url text;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS dropbox_url text;
