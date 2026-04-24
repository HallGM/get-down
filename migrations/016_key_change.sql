-- Add key_change field to songs (the band's default transposition for this song)
-- and override_key_change / unlinked_key_change to set_list_items (per-gig override,
-- matching the existing pattern for musical_key / override_key).

ALTER TABLE songs ADD COLUMN IF NOT EXISTS key_change VARCHAR(50);

ALTER TABLE set_list_items ADD COLUMN IF NOT EXISTS override_key_change VARCHAR(50);
ALTER TABLE set_list_items ADD COLUMN IF NOT EXISTS unlinked_key_change VARCHAR(50);
