BEGIN;

-- 1. Create genres table
CREATE TABLE genres (
  id   serial PRIMARY KEY,
  name varchar(255) NOT NULL UNIQUE
);

-- 2. Seed genres from existing freetext genre values on songs
INSERT INTO genres (name)
SELECT DISTINCT genre
FROM songs
WHERE genre IS NOT NULL AND genre <> ''
ON CONFLICT (name) DO NOTHING;

-- 3. Add genre_id FK column to songs (nullable)
ALTER TABLE songs
  ADD COLUMN genre_id int REFERENCES genres(id);

-- 4. Back-fill genre_id from existing genre text
UPDATE songs
SET genre_id = g.id
FROM genres g
WHERE g.name = songs.genre;

-- 5. Drop the old freetext genre column
ALTER TABLE songs
  DROP COLUMN genre;

-- 6. Add override_duration to set_list_items
ALTER TABLE set_list_items
  ADD COLUMN override_duration int;

COMMIT;
