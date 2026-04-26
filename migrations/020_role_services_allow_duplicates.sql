-- Drop the composite primary key on role_services and replace with a serial id
-- This allows the same role to be added to a service more than once

ALTER TABLE role_services DROP CONSTRAINT IF EXISTS role_services_pkey;

ALTER TABLE role_services ADD COLUMN IF NOT EXISTS id serial;

-- Make id the new primary key
ALTER TABLE role_services ADD PRIMARY KEY (id);
