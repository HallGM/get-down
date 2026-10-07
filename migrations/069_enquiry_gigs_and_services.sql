BEGIN;

UPDATE gigs SET enquiry_id = NULL WHERE enquiry_id IS NOT NULL;
ALTER TABLE gigs DROP CONSTRAINT IF EXISTS gigs_enquiry_id_fkey;
ALTER TABLE gigs DROP COLUMN IF EXISTS enquiry_id;
ALTER TABLE gigs ALTER COLUMN date DROP NOT NULL;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS enquiry_notes text;

CREATE TABLE enquiry_services (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL UNIQUE
);
CREATE TABLE gig_enquiry_services (
  gig_id int NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  enquiry_service_id int NOT NULL REFERENCES enquiry_services(id) ON DELETE RESTRICT,
  PRIMARY KEY (gig_id, enquiry_service_id)
);
INSERT INTO enquiry_services (name) VALUES
  ('Live Band (3/5/7 piece)'), ('Wedding Film'), ('Photography'),
  ('Saxophone Solo'), ('Singing Waiting'), ('Ceilidh'), ('Bagpipes'),
  ('DJ'), ('Karaoke/Bandeoke') ON CONFLICT (name) DO NOTHING;

DROP TABLE IF EXISTS enquiries_services;
DROP TABLE IF EXISTS enquiries;
COMMIT;
