ALTER TABLE showcases ADD COLUMN cost_airtable int;

CREATE TABLE IF NOT EXISTS showcase_expenses (
  showcase_id int NOT NULL REFERENCES showcases(id) ON DELETE CASCADE,
  expense_id  int NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  PRIMARY KEY (showcase_id, expense_id)
);
