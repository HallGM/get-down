-- Step 1: Add fee column to roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS fee int;

-- Step 2: Seed role fees from service fee_per_person via role_services
-- For roles linked to multiple services with different fees, log a notice and use the lowest service_id's fee
DO $$
DECLARE
  r RECORD;
  conflict_fees TEXT;
BEGIN
  -- Find roles linked to multiple services with differing fees and log them
  FOR r IN
    SELECT
      ro.id AS role_id,
      ro.name AS role_name,
      string_agg(s.name || ' (fee: ' || COALESCE(s.fee_per_person::text, 'null') || ')', ', ' ORDER BY s.id) AS service_details
    FROM roles ro
    JOIN role_services rs ON rs.role_id = ro.id
    JOIN services s ON s.id = rs.service_id
    WHERE s.fee_per_person IS NOT NULL
    GROUP BY ro.id, ro.name
    HAVING COUNT(DISTINCT s.fee_per_person) > 1
  LOOP
    RAISE NOTICE 'Role "%" is linked to multiple services with different fees: %. Using fee from the service with the lowest id.', r.role_name, r.service_details;
  END LOOP;

  -- Set role fee from the service with the lowest id among linked services
  UPDATE roles ro
  SET fee = (
    SELECT s.fee_per_person
    FROM role_services rs
    JOIN services s ON s.id = rs.service_id
    WHERE rs.role_id = ro.id
      AND s.fee_per_person IS NOT NULL
    ORDER BY s.id
    LIMIT 1
  )
  WHERE EXISTS (
    SELECT 1
    FROM role_services rs
    JOIN services s ON s.id = rs.service_id
    WHERE rs.role_id = ro.id
      AND s.fee_per_person IS NOT NULL
  );
END;
$$;

-- Step 3: Add gig_id to fee_allocations
ALTER TABLE fee_allocations ADD COLUMN IF NOT EXISTS gig_id int REFERENCES gigs(id) ON DELETE CASCADE;

-- Step 4: Make person_id nullable on fee_allocations
ALTER TABLE fee_allocations ALTER COLUMN person_id DROP NOT NULL;

-- Step 5: Drop fee_per_person and number_of_people from services
ALTER TABLE services
  DROP COLUMN IF EXISTS fee_per_person,
  DROP COLUMN IF EXISTS number_of_people;
