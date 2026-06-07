-- Seed data — idempotent (ON CONFLICT DO NOTHING relies on UNIQUE constraint on services.name)

-- Business account (singleton — partial unique index on is_business ensures only one)
INSERT INTO accounts (is_business) VALUES (true)
ON CONFLICT (is_business) WHERE is_business = true DO NOTHING;

-- Dev user: admin@get-down.com / password (local only — skipped in production)
DO $$
BEGIN
  IF current_setting('app.env', true) IS DISTINCT FROM 'production' THEN
    INSERT INTO people (first_name, last_name, email, password_hash, is_partner, is_active)
    VALUES ('Admin', 'User', 'admin@get-down.com', '$2b$10$OKvZJqr6hX8FpUJ8y3R62.wJQFQ6BXE2LWEFRHg6JOSdfMUyeckTe', true, true)
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO accounts (person_id)
    SELECT p.id FROM people p
    WHERE p.email = 'admin@get-down.com'
      AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.person_id = p.id);
  END IF;
END $$;

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

-- ─── Dev-only seed data ───────────────────────────────────────────────────────
-- Realistic fake records for local development. Skipped in production.
-- Records are identified by their description/title/email so re-runs are safe.

DO $$
DECLARE
  v_pop_id              int;
  v_rock_id             int;
  v_garry_id            int;
  v_scott_id            int;
  v_garry_account_id    int;
  v_business_account_id int;
  v_expense1_id         int;
  v_expense2_id         int;
BEGIN
  IF current_setting('app.env', true) IS DISTINCT FROM 'production' THEN

    -- Genres
    INSERT INTO genres (name) VALUES ('Pop')  ON CONFLICT (name) DO NOTHING;
    INSERT INTO genres (name) VALUES ('Rock') ON CONFLICT (name) DO NOTHING;
    SELECT id INTO v_pop_id  FROM genres WHERE name = 'Pop';
    SELECT id INTO v_rock_id FROM genres WHERE name = 'Rock';

    -- Songs (5): three Pop, two Rock
    INSERT INTO songs (title, artist, genre_id, musical_key, vocal_type, active)
    SELECT 'Dev Seed: Dancing in the Moonlight', 'Toploader', v_pop_id, 'A', 'M', true
    WHERE NOT EXISTS (SELECT 1 FROM songs WHERE title = 'Dev Seed: Dancing in the Moonlight');

    INSERT INTO songs (title, artist, genre_id, musical_key, vocal_type, active)
    SELECT 'Dev Seed: Uptown Funk', 'Mark Ronson', v_pop_id, 'D', 'M', true
    WHERE NOT EXISTS (SELECT 1 FROM songs WHERE title = 'Dev Seed: Uptown Funk');

    INSERT INTO songs (title, artist, genre_id, musical_key, vocal_type, active)
    SELECT 'Dev Seed: Valerie', 'Amy Winehouse', v_pop_id, 'G', 'F', true
    WHERE NOT EXISTS (SELECT 1 FROM songs WHERE title = 'Dev Seed: Valerie');

    INSERT INTO songs (title, artist, genre_id, musical_key, vocal_type, active)
    SELECT 'Dev Seed: Mr Brightside', 'The Killers', v_rock_id, 'B', 'M', true
    WHERE NOT EXISTS (SELECT 1 FROM songs WHERE title = 'Dev Seed: Mr Brightside');

    INSERT INTO songs (title, artist, genre_id, musical_key, vocal_type, active)
    SELECT 'Dev Seed: Don''t Stop Me Now', 'Queen', v_rock_id, 'F', 'M', true
    WHERE NOT EXISTS (SELECT 1 FROM songs WHERE title = 'Dev Seed: Don''t Stop Me Now');

    -- Partner people (password: "password" — same hash as admin@get-down.com)
    INSERT INTO people (first_name, last_name, email, password_hash, is_partner, is_active)
    VALUES ('Garry', 'Hall', 'garry@dev.local',
            '$2b$10$OKvZJqr6hX8FpUJ8y3R62.wJQFQ6BXE2LWEFRHg6JOSdfMUyeckTe', true, true)
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO people (first_name, last_name, email, password_hash, is_partner, is_active)
    VALUES ('Scott', 'Reid', 'scott@dev.local',
            '$2b$10$OKvZJqr6hX8FpUJ8y3R62.wJQFQ6BXE2LWEFRHg6JOSdfMUyeckTe', true, true)
    ON CONFLICT (email) DO NOTHING;

    SELECT id INTO v_garry_id FROM people WHERE email = 'garry@dev.local';
    SELECT id INTO v_scott_id FROM people WHERE email = 'scott@dev.local';

    -- Accounts for partner people
    INSERT INTO accounts (person_id)
    SELECT v_garry_id
    WHERE v_garry_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM accounts WHERE person_id = v_garry_id);

    INSERT INTO accounts (person_id)
    SELECT v_scott_id
    WHERE v_scott_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM accounts WHERE person_id = v_scott_id);

    SELECT id INTO v_garry_account_id    FROM accounts WHERE person_id = v_garry_id;
    SELECT id INTO v_business_account_id FROM accounts WHERE is_business = true LIMIT 1;

    -- Attribution (referral)
    INSERT INTO attributions (name, type)
    SELECT 'Dev Seed Referral', 'referral'
    WHERE NOT EXISTS (SELECT 1 FROM attributions WHERE name = 'Dev Seed Referral');

    -- Gigs (various states)

    -- Past completed gig — should not appear on dashboard
    INSERT INTO gigs (first_name, last_name, date, status, total_price,
                      travel_cost, discount_percent, venue_name, location)
    SELECT 'Charlie', 'Testington', CURRENT_DATE - INTERVAL '3 months', 'completed', 180000,
           0, 0, 'Dev Seed: The Assembly Rooms', 'Edinburgh'
    WHERE NOT EXISTS (
      SELECT 1 FROM gigs WHERE first_name = 'Charlie' AND last_name = 'Testington'
    );

    -- Cancelled gig — should not appear on dashboard
    INSERT INTO gigs (first_name, last_name, date, status, total_price,
                      travel_cost, discount_percent, venue_name, location)
    SELECT 'Eve', 'Devson', CURRENT_DATE + INTERVAL '1 month', 'cancelled', 200000,
           0, 0, 'Dev Seed: The Balmoral', 'Edinburgh'
    WHERE NOT EXISTS (
      SELECT 1 FROM gigs WHERE first_name = 'Eve' AND last_name = 'Devson'
    );

    -- Gig 3+ months away, no payment => "No Deposit" only
    INSERT INTO gigs (first_name, last_name, date, status, total_price,
                      travel_cost, discount_percent, venue_name, location)
    SELECT 'Alice', 'Sample', CURRENT_DATE + INTERVAL '3 months', 'confirmed', 250000,
           5000, 0, 'Dev Seed: The Grand Hotel', 'Edinburgh'
    WHERE NOT EXISTS (
      SELECT 1 FROM gigs WHERE first_name = 'Alice' AND last_name = 'Sample'
    );

    -- Gig 6 weeks away, no payment => "No Deposit" AND "Balance Due Soon"
    INSERT INTO gigs (first_name, last_name, date, status, total_price,
                      travel_cost, discount_percent, venue_name, location)
    SELECT 'Dev Balance', 'Alert', CURRENT_DATE + INTERVAL '6 weeks', 'confirmed', 200000,
           0, 0, 'Dev Seed: The Usher Hall', 'Edinburgh'
    WHERE NOT EXISTS (
      SELECT 1 FROM gigs WHERE first_name = 'Dev Balance' AND last_name = 'Alert'
    );

    -- Gig 5 weeks away, deposit paid but balance outstanding => "Balance Due Soon" only
    INSERT INTO gigs (first_name, last_name, date, status, total_price,
                      travel_cost, discount_percent, venue_name, location)
    SELECT 'Dev Partial', 'Alert', CURRENT_DATE + INTERVAL '5 weeks', 'confirmed', 180000,
           0, 0, 'Dev Seed: Dynamic Earth', 'Edinburgh'
    WHERE NOT EXISTS (
      SELECT 1 FROM gigs WHERE first_name = 'Dev Partial' AND last_name = 'Alert'
    );

    -- Deposit payment for the partial-paid gig (20% of £1800 = £360)
    INSERT INTO payments (gig_id, date, amount, method, description)
    SELECT g.id, CURRENT_DATE - INTERVAL '1 month', 36000, 'Bank transfer', 'Dev Seed: Deposit'
    FROM gigs g
    WHERE g.first_name = 'Dev Partial' AND g.last_name = 'Alert'
      AND NOT EXISTS (
        SELECT 1 FROM payments p2
        WHERE p2.gig_id = g.id AND p2.description = 'Dev Seed: Deposit'
      );

    -- Expenses (two categories: Travel and Equipment)
    INSERT INTO expenses (date, amount, description, category)
    SELECT '2026-01-10', 4500, 'Dev Seed: Fuel costs Jan 2026', 'Travel'
    WHERE NOT EXISTS (
      SELECT 1 FROM expenses WHERE description = 'Dev Seed: Fuel costs Jan 2026'
    );

    INSERT INTO expenses (date, amount, description, category)
    SELECT '2026-02-03', 12000, 'Dev Seed: PA equipment hire Feb 2026', 'Equipment'
    WHERE NOT EXISTS (
      SELECT 1 FROM expenses WHERE description = 'Dev Seed: PA equipment hire Feb 2026'
    );

    SELECT id INTO v_expense1_id FROM expenses WHERE description = 'Dev Seed: Fuel costs Jan 2026';
    SELECT id INTO v_expense2_id FROM expenses WHERE description = 'Dev Seed: PA equipment hire Feb 2026';

    -- Expense payments (fuel paid by Garry; equipment paid by business account)
    INSERT INTO expense_payments (expense_id, account_id, amount, date, payment_method)
    SELECT v_expense1_id, v_garry_account_id, 4500, '2026-01-10', 'Bank transfer'
    WHERE v_expense1_id IS NOT NULL
      AND v_garry_account_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM expense_payments WHERE expense_id = v_expense1_id);

    INSERT INTO expense_payments (expense_id, account_id, amount, date, payment_method)
    SELECT v_expense2_id, v_business_account_id, 12000, '2026-02-04', 'Bank transfer'
    WHERE v_expense2_id IS NOT NULL
      AND v_business_account_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM expense_payments WHERE expense_id = v_expense2_id);

  END IF;
END $$;
