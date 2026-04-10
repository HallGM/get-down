-- Migration 012: house playlist table and unlinked set list songs
-- Adds a shared house_playlist_songs table.
-- Makes set_list_items.song_id nullable to support unlinked (off-catalogue) songs.
-- Adds unlinked_title, unlinked_artist, unlinked_key, unlinked_vocal_type to set_list_items.
-- A CHECK constraint ensures every row has either a song_id or an unlinked_title.

-- House playlist: one global list, no per-gig relationship
CREATE TABLE IF NOT EXISTS house_playlist_songs (
  id      SERIAL PRIMARY KEY,
  song_id INT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  UNIQUE (song_id)
);

-- Allow song_id to be NULL (unlinked songs have no catalogue entry)
ALTER TABLE set_list_items ALTER COLUMN song_id DROP NOT NULL;

-- Unlinked song fields
ALTER TABLE set_list_items ADD COLUMN IF NOT EXISTS unlinked_title      VARCHAR(255);
ALTER TABLE set_list_items ADD COLUMN IF NOT EXISTS unlinked_artist     VARCHAR(255);
ALTER TABLE set_list_items ADD COLUMN IF NOT EXISTS unlinked_key        VARCHAR(50);
ALTER TABLE set_list_items ADD COLUMN IF NOT EXISTS unlinked_vocal_type VARCHAR(50);

-- Ensure every row is either linked (song_id) or unlinked (unlinked_title)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'set_list_items_song_or_unlinked'
  ) THEN
    ALTER TABLE set_list_items
      ADD CONSTRAINT set_list_items_song_or_unlinked
      CHECK (song_id IS NOT NULL OR unlinked_title IS NOT NULL);
  END IF;
END $$;
