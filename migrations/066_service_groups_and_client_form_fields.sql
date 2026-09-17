CREATE TABLE IF NOT EXISTS service_groups (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS service_service_groups (
  service_id int NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  group_id int NOT NULL REFERENCES service_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, group_id)
);

INSERT INTO service_groups (name) VALUES
  ('Ceremony music'), ('Evening entertainment'), ('Bagpipes'), ('Videography'),
  ('Getting ready'), ('Band'), ('DJ only'), ('Requires meal')
ON CONFLICT (name) DO NOTHING;

INSERT INTO service_service_groups (service_id, group_id)
SELECT s.id, g.id FROM services s CROSS JOIN service_groups g
WHERE ((s.is_band AND g.name = 'Band') OR (s.is_dj_only AND g.name = 'DJ only') OR (s.requires_meal AND g.name = 'Requires meal'))
ON CONFLICT DO NOTHING;

ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS ceremony_song_choices text,
  ADD COLUMN IF NOT EXISTS reception_music_advice text,
  ADD COLUMN IF NOT EXISTS walk_on_song text,
  ADD COLUMN IF NOT EXISTS introduction_wording text,
  ADD COLUMN IF NOT EXISTS piper_tune_requests text,
  ADD COLUMN IF NOT EXISTS speeches_pa_requirements text,
  ADD COLUMN IF NOT EXISTS ceremony_readings_notes text,
  ADD COLUMN IF NOT EXISTS preparation_locations text;

ALTER TABLE services DROP COLUMN IF EXISTS is_band;
ALTER TABLE services DROP COLUMN IF EXISTS is_dj_only;
ALTER TABLE services DROP COLUMN IF EXISTS requires_meal;
