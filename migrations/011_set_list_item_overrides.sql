-- Add per-gig key and vocal type overrides to set_list_items.
-- These columns allow a song's key and vocal type to be adjusted for a specific
-- gig's set list without modifying the underlying songs record.

ALTER TABLE set_list_items ADD COLUMN IF NOT EXISTS override_key VARCHAR(50);
ALTER TABLE set_list_items ADD COLUMN IF NOT EXISTS override_vocal_type VARCHAR(50);
