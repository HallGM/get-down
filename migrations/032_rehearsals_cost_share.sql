ALTER TABLE rehearsals ADD COLUMN expense_id int REFERENCES expenses(id) ON DELETE SET NULL;
ALTER TABLE rehearsals_gigs ADD COLUMN cost_share int;
