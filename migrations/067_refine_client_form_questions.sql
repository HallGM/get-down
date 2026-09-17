ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS bagpipes_details text;

ALTER TABLE gigs
  RENAME COLUMN reception_music_advice TO reception_music_details;
