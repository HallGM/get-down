-- Keep the legacy combined service usable for existing local databases. Fresh
-- databases receive separate band-size services from seed.sql.
UPDATE services
SET is_band = true
WHERE name = 'Live Band (3/5/7 piece)';
