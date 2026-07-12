-- Create legacy_invoices table for manually-uploaded invoices from older gigs.
-- Fields invoice_number, date, and description are all optional.
-- document_key references the R2-stored invoice file.

CREATE TABLE "legacy_invoices" (
  "id" SERIAL PRIMARY KEY,
  "gig_id" int NOT NULL,
  "invoice_number" varchar(255),
  "date" date,
  "description" varchar(255),
  "document_key" varchar(500)
);

ALTER TABLE "legacy_invoices" ADD FOREIGN KEY ("gig_id") REFERENCES "gigs" ("id") DEFERRABLE INITIALLY IMMEDIATE;
