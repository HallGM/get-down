ALTER TABLE services RENAME COLUMN is_dj TO is_dj_only;
ALTER TABLE services ADD COLUMN requires_meal boolean NOT NULL DEFAULT false;
