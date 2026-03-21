-- Seed data — idempotent (ON CONFLICT DO NOTHING relies on UNIQUE constraint on services.name)

INSERT INTO services (name) VALUES ('Live Band (3/5/7 piece)') ON CONFLICT DO NOTHING;
INSERT INTO services (name) VALUES ('Wedding Film')            ON CONFLICT DO NOTHING;
INSERT INTO services (name) VALUES ('Photography')             ON CONFLICT DO NOTHING;
INSERT INTO services (name) VALUES ('Singing Waiting')         ON CONFLICT DO NOTHING;
INSERT INTO services (name) VALUES ('Bagpipes')                ON CONFLICT DO NOTHING;
INSERT INTO services (name) VALUES ('Acoustic Duo')            ON CONFLICT DO NOTHING;
INSERT INTO services (name) VALUES ('Karaoke/Bandeoke')        ON CONFLICT DO NOTHING;
INSERT INTO services (name) VALUES ('Saxophone Solo')          ON CONFLICT DO NOTHING;
INSERT INTO services (name) VALUES ('DJ')                      ON CONFLICT DO NOTHING;
INSERT INTO services (name) VALUES ('Ceilidh')                 ON CONFLICT DO NOTHING;

INSERT INTO roles (name) VALUES ('Vocals')              ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('Guitar')              ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('Bass')                ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('Drums')               ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('Keys')                ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('Saxophone')           ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('Bagpipes')            ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('DJ')                  ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('Photographer')        ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('Videographer')        ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('Second Shooter')      ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('Caller')              ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('Fiddle')              ON CONFLICT DO NOTHING;
