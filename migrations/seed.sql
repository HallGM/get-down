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

-- ─── Dev-only: showcase with a fee allocation ────────────────────────────────
-- Provides a showcase-linked allocation for testing the linked fee allocations
-- display (showcase link path is /showcases/:id, gig path is /gigs/:id/roles).

DO $$
DECLARE
  v_garry_id           int;
  v_garry_account_id   int;
  v_attribution_id     int;
  v_showcase_id        int;
  v_fa_showcase_id     int;
  v_tx_showcase_id     int;
BEGIN
  IF current_setting('app.env', true) IS DISTINCT FROM 'production' THEN

    SELECT id INTO v_garry_id         FROM people   WHERE email = 'garry@dev.local';
    SELECT id INTO v_garry_account_id FROM accounts WHERE person_id = v_garry_id;

    -- Attribution for the showcase
    INSERT INTO attributions (name, type)
    SELECT 'Dev Seed Showcase Co', 'other'
    WHERE NOT EXISTS (SELECT 1 FROM attributions WHERE name = 'Dev Seed Showcase Co');
    SELECT id INTO v_attribution_id FROM attributions WHERE name = 'Dev Seed Showcase Co';

    -- Showcase
    INSERT INTO showcases (attribution_id, nickname, full_name, date, location)
    SELECT v_attribution_id, 'Dev Seed Showcase', 'Dev Seed Showcase Event',
           CURRENT_DATE - INTERVAL '1 month', 'Glasgow'
    WHERE v_attribution_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM showcases WHERE attribution_id = v_attribution_id);
    SELECT id INTO v_showcase_id FROM showcases WHERE attribution_id = v_attribution_id;

    -- Fee allocation (no gig_id — showcase allocations are linked via assigned_roles)
    INSERT INTO fee_allocations (person_id, gig_id, notes, is_invoiced)
    SELECT v_garry_id, NULL, 'Vocals', false
    WHERE v_garry_id IS NOT NULL AND v_showcase_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM fee_allocations fa
        JOIN assigned_roles ar ON ar.fee_allocation_id = fa.id
        WHERE fa.person_id = v_garry_id AND ar.showcase_id = v_showcase_id
      )
    RETURNING id INTO v_fa_showcase_id;

    -- If allocation was just created, add a line item and an assigned_role
    IF v_fa_showcase_id IS NOT NULL THEN
      INSERT INTO fee_allocation_line_items (allocation_id, description, amount)
      VALUES (v_fa_showcase_id, 'Vocals', 18000);

      INSERT INTO assigned_roles (showcase_id, person_id, role_name, fee_allocation_id)
      VALUES (v_showcase_id, v_garry_id, 'Vocals', v_fa_showcase_id);
    END IF;

    -- Re-fetch allocation ID for idempotent re-runs
    SELECT fa.id INTO v_fa_showcase_id
    FROM fee_allocations fa
    JOIN assigned_roles ar ON ar.fee_allocation_id = fa.id
    WHERE fa.person_id = v_garry_id AND ar.showcase_id = v_showcase_id
    LIMIT 1;

    -- Transaction in Garry's account linked to the showcase allocation
    INSERT INTO account_transactions (account_id, date, amount, type, description)
    SELECT v_garry_account_id, CURRENT_DATE - INTERVAL '3 weeks', -18000, 'Drawing',
           'Dev Seed: Dev Seed Showcase fee'
    WHERE v_garry_account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions
        WHERE account_id = v_garry_account_id
          AND description = 'Dev Seed: Dev Seed Showcase fee'
      )
    RETURNING id INTO v_tx_showcase_id;

    INSERT INTO account_transactions_fee_allocations (transaction_id, allocation_id)
    SELECT v_tx_showcase_id, v_fa_showcase_id
    WHERE v_tx_showcase_id IS NOT NULL AND v_fa_showcase_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions_fee_allocations
        WHERE transaction_id = v_tx_showcase_id AND allocation_id = v_fa_showcase_id
      );

  END IF;
END $$;

-- ─── Dev-only: transactions linked to fee allocations ────────────────────────

DO $$
DECLARE
  v_garry_id         int;
  v_scott_id         int;
  v_garry_account_id int;
  v_scott_account_id int;
  v_fa_garry_alice   int;
  v_fa_garry_balance int;
  v_fa_scott_alice   int;
  v_tx1_id           int;
  v_tx2_id           int;
  v_tx3_id           int;
BEGIN
  IF current_setting('app.env', true) IS DISTINCT FROM 'production' THEN

    SELECT id INTO v_garry_id         FROM people   WHERE email = 'garry@dev.local';
    SELECT id INTO v_scott_id         FROM people   WHERE email = 'scott@dev.local';
    SELECT id INTO v_garry_account_id FROM accounts WHERE person_id = v_garry_id;
    SELECT id INTO v_scott_account_id FROM accounts WHERE person_id = v_scott_id;

    -- Find the allocations inserted in the previous block
    SELECT fa.id INTO v_fa_garry_alice
    FROM fee_allocations fa
    JOIN gigs g ON g.id = fa.gig_id
    WHERE fa.person_id = v_garry_id
      AND g.first_name = 'Alice' AND g.last_name = 'Sample';

    SELECT fa.id INTO v_fa_garry_balance
    FROM fee_allocations fa
    JOIN gigs g ON g.id = fa.gig_id
    WHERE fa.person_id = v_garry_id
      AND g.first_name = 'Dev Balance' AND g.last_name = 'Alert';

    SELECT fa.id INTO v_fa_scott_alice
    FROM fee_allocations fa
    JOIN gigs g ON g.id = fa.gig_id
    WHERE fa.person_id = v_scott_id
      AND g.first_name = 'Alice' AND g.last_name = 'Sample';

    -- Transaction 1: Garry paid for Alice Sample gig (linked to his allocation)
    INSERT INTO account_transactions (account_id, date, amount, type, description)
    SELECT v_garry_account_id, CURRENT_DATE - INTERVAL '2 weeks', -25000, 'Drawing',
           'Dev Seed: Alice Sample gig fee'
    WHERE v_garry_account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions
        WHERE account_id = v_garry_account_id
          AND description = 'Dev Seed: Alice Sample gig fee'
      )
    RETURNING id INTO v_tx1_id;

    INSERT INTO account_transactions_fee_allocations (transaction_id, allocation_id)
    SELECT v_tx1_id, v_fa_garry_alice
    WHERE v_tx1_id IS NOT NULL AND v_fa_garry_alice IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions_fee_allocations
        WHERE transaction_id = v_tx1_id AND allocation_id = v_fa_garry_alice
      );

    -- Transaction 2: Garry paid for Dev Balance Alert gig (linked to his allocation)
    INSERT INTO account_transactions (account_id, date, amount, type, description)
    SELECT v_garry_account_id, CURRENT_DATE - INTERVAL '1 week', -25000, 'Drawing',
           'Dev Seed: Dev Balance Alert gig fee'
    WHERE v_garry_account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions
        WHERE account_id = v_garry_account_id
          AND description = 'Dev Seed: Dev Balance Alert gig fee'
      )
    RETURNING id INTO v_tx2_id;

    INSERT INTO account_transactions_fee_allocations (transaction_id, allocation_id)
    SELECT v_tx2_id, v_fa_garry_balance
    WHERE v_tx2_id IS NOT NULL AND v_fa_garry_balance IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions_fee_allocations
        WHERE transaction_id = v_tx2_id AND allocation_id = v_fa_garry_balance
      );

    -- Transaction 3: Scott paid for Alice Sample gig (linked to his allocation)
    INSERT INTO account_transactions (account_id, date, amount, type, description)
    SELECT v_scott_account_id, CURRENT_DATE - INTERVAL '2 weeks', -20000, 'Drawing',
           'Dev Seed: Alice Sample gig fee'
    WHERE v_scott_account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions
        WHERE account_id = v_scott_account_id
          AND description = 'Dev Seed: Alice Sample gig fee'
      )
    RETURNING id INTO v_tx3_id;

    INSERT INTO account_transactions_fee_allocations (transaction_id, allocation_id)
    SELECT v_tx3_id, v_fa_scott_alice
    WHERE v_tx3_id IS NOT NULL AND v_fa_scott_alice IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions_fee_allocations
        WHERE transaction_id = v_tx3_id AND allocation_id = v_fa_scott_alice
      );

  END IF;
END $$;

-- ─── Dev-only: showcase apportionment mismatch data ──────────────────────────
-- Provides rows for the "Showcase Apportionment Mismatches" dashboard section.
-- expense1 (under) and expense2 (over) should appear; expense3 (exact match)
-- and expense4 (all-null amounts) should not.

DO $$
DECLARE
  v_attr1_id     int;
  v_attr2_id     int;
  v_showcase1_id int;
  v_showcase2_id int;
  v_expense1_id  int;
  v_expense2_id  int;
  v_expense3_id  int;
  v_expense4_id  int;
BEGIN
  IF current_setting('app.env', true) IS DISTINCT FROM 'production' THEN

    SELECT id INTO v_attr1_id FROM attributions WHERE name = 'Dev Seed Showcase Co';

    -- Second attribution and showcase
    INSERT INTO attributions (name, type)
    SELECT 'Dev Seed Showcase B Co', 'other'
    WHERE NOT EXISTS (SELECT 1 FROM attributions WHERE name = 'Dev Seed Showcase B Co');
    SELECT id INTO v_attr2_id FROM attributions WHERE name = 'Dev Seed Showcase B Co';

    INSERT INTO showcases (attribution_id, nickname, date, location)
    SELECT v_attr2_id, 'Dev Seed Showcase B', CURRENT_DATE - INTERVAL '2 months', 'Edinburgh'
    WHERE v_attr2_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM showcases WHERE attribution_id = v_attr2_id);

    SELECT id INTO v_showcase1_id FROM showcases WHERE attribution_id = v_attr1_id;
    SELECT id INTO v_showcase2_id FROM showcases WHERE attribution_id = v_attr2_id;

    -- Expense 1: UNDER-apportioned → should appear in alert
    -- Total £500, each showcase gets £200 = £400 assigned, £100 short
    INSERT INTO expenses (date, amount, description, category)
    SELECT '2026-03-15', 50000, 'Dev Seed: Sound system hire Mar 2026', 'Equipment'
    WHERE NOT EXISTS (
      SELECT 1 FROM expenses WHERE description = 'Dev Seed: Sound system hire Mar 2026'
    );
    SELECT id INTO v_expense1_id FROM expenses
    WHERE description = 'Dev Seed: Sound system hire Mar 2026';

    INSERT INTO showcase_expenses (showcase_id, expense_id, apportioned_amount)
    SELECT v_showcase1_id, v_expense1_id, 20000
    WHERE v_showcase1_id IS NOT NULL AND v_expense1_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM showcase_expenses
        WHERE showcase_id = v_showcase1_id AND expense_id = v_expense1_id
      );

    INSERT INTO showcase_expenses (showcase_id, expense_id, apportioned_amount)
    SELECT v_showcase2_id, v_expense1_id, 20000
    WHERE v_showcase2_id IS NOT NULL AND v_expense1_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM showcase_expenses
        WHERE showcase_id = v_showcase2_id AND expense_id = v_expense1_id
      );

    -- Expense 2: OVER-apportioned → should appear in alert
    -- Total £300, each showcase gets £200 = £400 assigned, £100 over
    INSERT INTO expenses (date, amount, description, category)
    SELECT '2026-03-20', 30000, 'Dev Seed: Venue decoration Mar 2026', 'Venue'
    WHERE NOT EXISTS (
      SELECT 1 FROM expenses WHERE description = 'Dev Seed: Venue decoration Mar 2026'
    );
    SELECT id INTO v_expense2_id FROM expenses
    WHERE description = 'Dev Seed: Venue decoration Mar 2026';

    INSERT INTO showcase_expenses (showcase_id, expense_id, apportioned_amount)
    SELECT v_showcase1_id, v_expense2_id, 20000
    WHERE v_showcase1_id IS NOT NULL AND v_expense2_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM showcase_expenses
        WHERE showcase_id = v_showcase1_id AND expense_id = v_expense2_id
      );

    INSERT INTO showcase_expenses (showcase_id, expense_id, apportioned_amount)
    SELECT v_showcase2_id, v_expense2_id, 20000
    WHERE v_showcase2_id IS NOT NULL AND v_expense2_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM showcase_expenses
        WHERE showcase_id = v_showcase2_id AND expense_id = v_expense2_id
      );

    -- Expense 3: correctly apportioned → should NOT appear in alert
    -- Total £400, each showcase gets £200 = £400 assigned, exact match
    INSERT INTO expenses (date, amount, description, category)
    SELECT '2026-03-10', 40000, 'Dev Seed: Catering Mar 2026', 'Catering'
    WHERE NOT EXISTS (
      SELECT 1 FROM expenses WHERE description = 'Dev Seed: Catering Mar 2026'
    );
    SELECT id INTO v_expense3_id FROM expenses
    WHERE description = 'Dev Seed: Catering Mar 2026';

    INSERT INTO showcase_expenses (showcase_id, expense_id, apportioned_amount)
    SELECT v_showcase1_id, v_expense3_id, 20000
    WHERE v_showcase1_id IS NOT NULL AND v_expense3_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM showcase_expenses
        WHERE showcase_id = v_showcase1_id AND expense_id = v_expense3_id
      );

    INSERT INTO showcase_expenses (showcase_id, expense_id, apportioned_amount)
    SELECT v_showcase2_id, v_expense3_id, 20000
    WHERE v_showcase2_id IS NOT NULL AND v_expense3_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM showcase_expenses
        WHERE showcase_id = v_showcase2_id AND expense_id = v_expense3_id
      );

    -- Expense 4: all-null amounts → should NOT appear in alert
    -- No explicit amounts set on either link
    INSERT INTO expenses (date, amount, description, category)
    SELECT '2026-03-05', 15000, 'Dev Seed: Printing costs Mar 2026', 'Other'
    WHERE NOT EXISTS (
      SELECT 1 FROM expenses WHERE description = 'Dev Seed: Printing costs Mar 2026'
    );
    SELECT id INTO v_expense4_id FROM expenses
    WHERE description = 'Dev Seed: Printing costs Mar 2026';

    INSERT INTO showcase_expenses (showcase_id, expense_id)
    SELECT v_showcase1_id, v_expense4_id
    WHERE v_showcase1_id IS NOT NULL AND v_expense4_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM showcase_expenses
        WHERE showcase_id = v_showcase1_id AND expense_id = v_expense4_id
      );

    INSERT INTO showcase_expenses (showcase_id, expense_id)
    SELECT v_showcase2_id, v_expense4_id
    WHERE v_showcase2_id IS NOT NULL AND v_expense4_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM showcase_expenses
        WHERE showcase_id = v_showcase2_id AND expense_id = v_expense4_id
      );

  END IF;
END $$;

-- Provides rows for the "Fee allocations missing expenses" dashboard section.

DO $$
DECLARE
  v_garry_id       int;
  v_scott_id       int;
  v_alice_gig_id   int;
  v_balance_gig_id int;
  v_partial_gig_id int;
  v_fa1_id         int;
  v_fa2_id         int;
  v_fa3_id         int;
  v_fa4_id         int;
BEGIN
  IF current_setting('app.env', true) IS DISTINCT FROM 'production' THEN

    SELECT id INTO v_garry_id       FROM people WHERE email = 'garry@dev.local';
    SELECT id INTO v_scott_id       FROM people WHERE email = 'scott@dev.local';
    SELECT id INTO v_alice_gig_id   FROM gigs   WHERE first_name = 'Alice'       AND last_name = 'Sample';
    SELECT id INTO v_balance_gig_id FROM gigs   WHERE first_name = 'Dev Balance' AND last_name = 'Alert';
    SELECT id INTO v_partial_gig_id FROM gigs   WHERE first_name = 'Dev Partial' AND last_name = 'Alert';

    -- Allocation 1: Garry on Alice Sample gig
    INSERT INTO fee_allocations (person_id, gig_id, is_invoiced)
    SELECT v_garry_id, v_alice_gig_id, false
    WHERE v_garry_id IS NOT NULL AND v_alice_gig_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM fee_allocations
        WHERE person_id = v_garry_id AND gig_id = v_alice_gig_id
      );
    SELECT id INTO v_fa1_id FROM fee_allocations
    WHERE person_id = v_garry_id AND gig_id = v_alice_gig_id;

    INSERT INTO fee_allocation_line_items (allocation_id, description, amount)
    SELECT v_fa1_id, 'Vocals', 25000
    WHERE v_fa1_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM fee_allocation_line_items
        WHERE allocation_id = v_fa1_id AND description = 'Vocals'
      );

    -- Allocation 2: Scott on Alice Sample gig
    INSERT INTO fee_allocations (person_id, gig_id, is_invoiced)
    SELECT v_scott_id, v_alice_gig_id, false
    WHERE v_scott_id IS NOT NULL AND v_alice_gig_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM fee_allocations
        WHERE person_id = v_scott_id AND gig_id = v_alice_gig_id
      );
    SELECT id INTO v_fa2_id FROM fee_allocations
    WHERE person_id = v_scott_id AND gig_id = v_alice_gig_id;

    INSERT INTO fee_allocation_line_items (allocation_id, description, amount)
    SELECT v_fa2_id, 'Guitar', 20000
    WHERE v_fa2_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM fee_allocation_line_items
        WHERE allocation_id = v_fa2_id AND description = 'Guitar'
      );

    -- Allocation 3: Garry on Dev Balance Alert gig
    INSERT INTO fee_allocations (person_id, gig_id, is_invoiced)
    SELECT v_garry_id, v_balance_gig_id, false
    WHERE v_garry_id IS NOT NULL AND v_balance_gig_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM fee_allocations
        WHERE person_id = v_garry_id AND gig_id = v_balance_gig_id
      );
    SELECT id INTO v_fa3_id FROM fee_allocations
    WHERE person_id = v_garry_id AND gig_id = v_balance_gig_id;

    INSERT INTO fee_allocation_line_items (allocation_id, description, amount)
    SELECT v_fa3_id, 'Vocals', 25000
    WHERE v_fa3_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM fee_allocation_line_items
        WHERE allocation_id = v_fa3_id AND description = 'Vocals'
      );

    -- Allocation 4: unassigned on Dev Partial Alert gig
    INSERT INTO fee_allocations (person_id, gig_id, is_invoiced)
    SELECT NULL, v_partial_gig_id, false
    WHERE v_partial_gig_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM fee_allocations
        WHERE person_id IS NULL AND gig_id = v_partial_gig_id
      );
    SELECT id INTO v_fa4_id FROM fee_allocations
    WHERE person_id IS NULL AND gig_id = v_partial_gig_id;

    INSERT INTO fee_allocation_line_items (allocation_id, description, amount)
    SELECT v_fa4_id, 'Keys', 15000
    WHERE v_fa4_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM fee_allocation_line_items
        WHERE allocation_id = v_fa4_id AND description = 'Keys'
      );

  END IF;
END $$;

-- ─── Dev-only: pre-partnership data (before 2024-09-01) ──────────────────────
-- These records exist solely to verify the partnership start date floor.
-- They must NOT appear in accounting summary totals or account balances/ledger.
-- They WILL appear on the gig and expense list pages (floor only applies to
-- financial calculations, not list views).

DO $$
DECLARE
  v_garry_id         int;
  v_garry_account_id int;
  v_pre_gig_id       int;
BEGIN
  IF current_setting('app.env', true) IS DISTINCT FROM 'production' THEN

    SELECT id INTO v_garry_id         FROM people   WHERE email = 'garry@dev.local';
    SELECT id INTO v_garry_account_id FROM accounts WHERE person_id = v_garry_id;

    -- Completed gig dated July 2024 — before the 1 Sep 2024 floor.
    -- Must not be counted in gigs booked/performed on the accounting page.
    INSERT INTO gigs (first_name, last_name, date, status, total_price,
                      travel_cost, discount_percent, venue_name, location)
    SELECT 'Dev Pre', 'Partnership', '2024-07-20', 'completed', 200000,
           0, 0, 'Dev Seed: Pre-Partnership Venue', 'Glasgow'
    WHERE NOT EXISTS (
      SELECT 1 FROM gigs WHERE first_name = 'Dev Pre' AND last_name = 'Partnership'
    );
    SELECT id INTO v_pre_gig_id FROM gigs
    WHERE first_name = 'Dev Pre' AND last_name = 'Partnership';

    -- Full payment for that gig (payment date also before the floor).
    -- Must not appear in pot income or earned income on the accounting page.
    INSERT INTO payments (gig_id, date, amount, method, description)
    SELECT v_pre_gig_id, '2024-07-20', 200000, 'Bank transfer',
           'Dev Seed: Pre-partnership full payment'
    WHERE v_pre_gig_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM payments
        WHERE gig_id = v_pre_gig_id
          AND description = 'Dev Seed: Pre-partnership full payment'
      );

    -- Expense dated August 2024 — must not appear in expenses total.
    INSERT INTO expenses (date, amount, description, category)
    SELECT '2024-08-10', 50000, 'Dev Seed: Pre-partnership equipment hire', 'Equipment'
    WHERE NOT EXISTS (
      SELECT 1 FROM expenses WHERE description = 'Dev Seed: Pre-partnership equipment hire'
    );

    -- Account transaction dated August 2024 — must not appear in Garry's
    -- account balance or ledger list, and must not appear in drawings on the
    -- accounting page.
    INSERT INTO account_transactions (account_id, date, amount, type, description)
    SELECT v_garry_account_id, '2024-08-15', -30000, 'Drawing',
           'Dev Seed: Pre-partnership drawing'
    WHERE v_garry_account_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM account_transactions
        WHERE account_id = v_garry_account_id
          AND description = 'Dev Seed: Pre-partnership drawing'
      );

  END IF;
END $$;
