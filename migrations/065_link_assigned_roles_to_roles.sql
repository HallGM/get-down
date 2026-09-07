ALTER TABLE assigned_roles
  ADD COLUMN IF NOT EXISTS role_id int;

ALTER TABLE assigned_roles
  DROP CONSTRAINT IF EXISTS assigned_roles_role_id_fkey;

ALTER TABLE assigned_roles
  ADD CONSTRAINT assigned_roles_role_id_fkey
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

UPDATE assigned_roles ar
SET role_id = r.id
FROM roles r
WHERE ar.gig_id IS NOT NULL
  AND ar.showcase_id IS NULL
  AND ar.role_id IS NULL
  AND ar.role_name = r.name;
