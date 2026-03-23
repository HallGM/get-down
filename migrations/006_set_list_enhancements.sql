-- Add vocal_type to songs and create gig–song preference junction tables

ALTER TABLE songs ADD COLUMN IF NOT EXISTS vocal_type VARCHAR(20);

CREATE TABLE IF NOT EXISTS gig_song_favourites (
  id      SERIAL PRIMARY KEY,
  gig_id  INT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  song_id INT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  UNIQUE (gig_id, song_id)
);

CREATE TABLE IF NOT EXISTS gig_song_must_plays (
  id      SERIAL PRIMARY KEY,
  gig_id  INT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  song_id INT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  UNIQUE (gig_id, song_id)
);

CREATE TABLE IF NOT EXISTS gig_song_do_not_plays (
  id      SERIAL PRIMARY KEY,
  gig_id  INT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  song_id INT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  UNIQUE (gig_id, song_id)
);
