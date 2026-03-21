ALTER TABLE "services"
  ADD COLUMN IF NOT EXISTS "category" varchar(100),
  ADD COLUMN IF NOT EXISTS "description" text,
  ADD COLUMN IF NOT EXISTS "price_to_client" int,
  ADD COLUMN IF NOT EXISTS "fee_per_person" int,
  ADD COLUMN IF NOT EXISTS "number_of_people" int,
  ADD COLUMN IF NOT EXISTS "extra_fee" int,
  ADD COLUMN IF NOT EXISTS "extra_fee_description" varchar(255),
  ADD COLUMN IF NOT EXISTS "is_band" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_dj" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "enquiries"
  ADD COLUMN IF NOT EXISTS "status" varchar(50) NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS "attribution_id" int;

CREATE TABLE IF NOT EXISTS "people" (
  "id" SERIAL PRIMARY KEY,
  "first_name" varchar(255) NOT NULL,
  "last_name" varchar(255),
  "display_name" varchar(255),
  "email" varchar(255),
  "phone" varchar(255),
  "bank_details" text,
  "password_hash" varchar(255),
  "is_partner" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS "people_email_unique_idx" ON "people" ("email");

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" SERIAL PRIMARY KEY,
  "person_id" int NOT NULL UNIQUE,
  FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account_transactions" (
  "id" SERIAL PRIMARY KEY,
  "date" date,
  "amount" int NOT NULL,
  "type" varchar(50) NOT NULL,
  "description" varchar(255),
  "account_id" int NOT NULL,
  FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "fee_allocations" (
  "id" SERIAL PRIMARY KEY,
  "person_id" int NOT NULL,
  "notes" text,
  "is_invoiced" boolean NOT NULL DEFAULT false,
  "is_paid" boolean NOT NULL DEFAULT false,
  "invoice_ref" varchar(255),
  FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account_transactions_fee_allocations" (
  "transaction_id" int NOT NULL,
  "allocation_id" int NOT NULL,
  PRIMARY KEY ("transaction_id", "allocation_id"),
  FOREIGN KEY ("transaction_id") REFERENCES "account_transactions" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("allocation_id") REFERENCES "fee_allocations" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "fee_allocation_line_items" (
  "id" SERIAL PRIMARY KEY,
  "allocation_id" int NOT NULL,
  "description" varchar(255),
  "amount" int,
  FOREIGN KEY ("allocation_id") REFERENCES "fee_allocations" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "roles" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "people_roles" (
  "person_id" int NOT NULL,
  "role_id" int NOT NULL,
  PRIMARY KEY ("person_id", "role_id"),
  FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "attributions" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "type" varchar(50) NOT NULL,
  "notes" text
);

ALTER TABLE "enquiries"
  ADD CONSTRAINT "enquiries_attribution_id_fkey"
  FOREIGN KEY ("attribution_id") REFERENCES "attributions" ("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "gigs" (
  "id" SERIAL PRIMARY KEY,
  "enquiry_id" int,
  "attribution_id" int,
  "name" varchar(255),
  "status" varchar(50) NOT NULL DEFAULT 'draft',
  "first_name" varchar(255) NOT NULL,
  "last_name" varchar(255) NOT NULL,
  "partner_name" varchar(255),
  "email" varchar(255),
  "phone" varchar(255),
  "date" date NOT NULL,
  "venue_name" varchar(255),
  "location" varchar(255),
  "description" text,
  "total_price" int,
  "deposit_paid" int NOT NULL DEFAULT 0,
  "balance_amount" int NOT NULL DEFAULT 0,
  FOREIGN KEY ("enquiry_id") REFERENCES "enquiries" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("attribution_id") REFERENCES "attributions" ("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "showcases" (
  "id" SERIAL PRIMARY KEY,
  "attribution_id" int NOT NULL UNIQUE,
  "nickname" varchar(255),
  "full_name" varchar(255),
  "name" varchar(255),
  "date" date NOT NULL,
  "location" varchar(255),
  FOREIGN KEY ("attribution_id") REFERENCES "attributions" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "gig_services" (
  "gig_id" int NOT NULL,
  "service_id" int NOT NULL,
  PRIMARY KEY ("gig_id", "service_id"),
  FOREIGN KEY ("gig_id") REFERENCES "gigs" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "role_services" (
  "role_id" int NOT NULL,
  "service_id" int NOT NULL,
  PRIMARY KEY ("role_id", "service_id"),
  FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "assigned_roles" (
  "id" SERIAL PRIMARY KEY,
  "gig_id" int,
  "person_id" int,
  "role_name" varchar(255) NOT NULL,
  "fee_allocation_id" int,
  "showcase_id" int,
  FOREIGN KEY ("gig_id") REFERENCES "gigs" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("fee_allocation_id") REFERENCES "fee_allocations" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("showcase_id") REFERENCES "showcases" ("id") ON DELETE CASCADE,
  CONSTRAINT "assigned_roles_parent_check" CHECK (
    (CASE WHEN "gig_id" IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "showcase_id" IS NULL THEN 0 ELSE 1 END) <= 1
  )
);

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" SERIAL PRIMARY KEY,
  "date" date,
  "amount" int NOT NULL,
  "description" varchar(255) NOT NULL,
  "category" varchar(100),
  "recipient_name" varchar(255),
  "payment_method" varchar(100)
);

CREATE TABLE IF NOT EXISTS "fee_allocations_expenses" (
  "allocation_id" int NOT NULL,
  "expense_id" int NOT NULL,
  PRIMARY KEY ("allocation_id", "expense_id"),
  FOREIGN KEY ("allocation_id") REFERENCES "fee_allocations" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("expense_id") REFERENCES "expenses" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" SERIAL PRIMARY KEY,
  "date" date,
  "amount" int NOT NULL,
  "method" varchar(100),
  "description" varchar(255),
  "gig_id" int NOT NULL,
  FOREIGN KEY ("gig_id") REFERENCES "gigs" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" SERIAL PRIMARY KEY,
  "gig_id" int NOT NULL,
  "invoice_number" varchar(255) NOT NULL UNIQUE,
  "customer_name" varchar(255) NOT NULL,
  "event_date" date,
  "venue" varchar(255),
  "date" date NOT NULL,
  "subtotal_amount" int NOT NULL DEFAULT 0,
  "discount_percent" int NOT NULL DEFAULT 0,
  "travel_cost" int NOT NULL DEFAULT 0,
  "total_amount" int NOT NULL DEFAULT 0,
  "amount_due" int NOT NULL DEFAULT 0,
  FOREIGN KEY ("gig_id") REFERENCES "gigs" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "invoice_line_items" (
  "id" SERIAL PRIMARY KEY,
  "invoice_id" int NOT NULL,
  "description" varchar(255),
  "amount" int,
  FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "invoice_additional_charges" (
  "id" SERIAL PRIMARY KEY,
  "invoice_id" int NOT NULL,
  "description" varchar(255),
  "amount" int,
  FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "invoice_payments_made" (
  "id" SERIAL PRIMARY KEY,
  "invoice_id" int NOT NULL,
  "description" varchar(255),
  "date" date,
  "amount" int,
  FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "attribution_fees" (
  "id" SERIAL PRIMARY KEY,
  "attribution_id" int NOT NULL,
  "description" varchar(255),
  "date" date,
  "amount" int,
  FOREIGN KEY ("attribution_id") REFERENCES "attributions" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "attribution_fees_expenses" (
  "attribution_fee_id" int NOT NULL,
  "expense_id" int NOT NULL,
  PRIMARY KEY ("attribution_fee_id", "expense_id"),
  FOREIGN KEY ("attribution_fee_id") REFERENCES "attribution_fees" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("expense_id") REFERENCES "expenses" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "songs" (
  "id" SERIAL PRIMARY KEY,
  "title" varchar(255) NOT NULL,
  "artist" varchar(255),
  "genre" varchar(255),
  "musical_key" varchar(50),
  "bpm" int
);

CREATE TABLE IF NOT EXISTS "set_list_items" (
  "id" SERIAL PRIMARY KEY,
  "gig_id" int NOT NULL,
  "song_id" int NOT NULL,
  "position" int,
  "notes" text,
  FOREIGN KEY ("gig_id") REFERENCES "gigs" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("song_id") REFERENCES "songs" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "rehearsals" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "date" date NOT NULL,
  "location" varchar(255),
  "cost" int,
  "notes" text
);

CREATE TABLE IF NOT EXISTS "rehearsals_gigs" (
  "rehearsal_id" int NOT NULL,
  "gig_id" int NOT NULL,
  PRIMARY KEY ("rehearsal_id", "gig_id"),
  FOREIGN KEY ("rehearsal_id") REFERENCES "rehearsals" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("gig_id") REFERENCES "gigs" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "rehearsals_expenses" (
  "rehearsal_id" int NOT NULL,
  "expense_id" int NOT NULL,
  PRIMARY KEY ("rehearsal_id", "expense_id"),
  FOREIGN KEY ("rehearsal_id") REFERENCES "rehearsals" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("expense_id") REFERENCES "expenses" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "todos" (
  "id" SERIAL PRIMARY KEY,
  "task" varchar(255) NOT NULL,
  "state" varchar(50) NOT NULL DEFAULT 'backlog',
  "created_at" timestamptz NOT NULL DEFAULT now()
);