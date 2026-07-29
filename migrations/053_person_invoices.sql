CREATE TABLE person_invoices (
  id serial PRIMARY KEY,
  person_id int NOT NULL,
  invoice_number varchar(255) NOT NULL UNIQUE,
  date date NOT NULL,
  total_amount int NOT NULL DEFAULT 0,
  expense_id int NOT NULL UNIQUE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
);

CREATE TABLE person_invoice_line_items (
  id serial PRIMARY KEY,
  person_invoice_id int NOT NULL,
  description varchar(255),
  amount int,
  FOREIGN KEY (person_invoice_id) REFERENCES person_invoices(id) ON DELETE CASCADE
);
