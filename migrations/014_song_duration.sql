-- Migration 014: song duration
-- Adds a duration column (integer seconds, nullable) to songs.
-- Adds an unlinked_duration column to set_list_items for off-catalogue songs.

ALTER TABLE songs ADD COLUMN IF NOT EXISTS duration INT;

ALTER TABLE set_list_items ADD COLUMN IF NOT EXISTS unlinked_duration INT;
