-- Add airtable_id tracking column to all Airtable-sourced tables.
-- Enables idempotent upsert migrations: match on airtable_id instead of aborting.
ALTER TABLE "services"     ADD COLUMN IF NOT EXISTS "airtable_id" varchar(255);
ALTER TABLE "people"       ADD COLUMN IF NOT EXISTS "airtable_id" varchar(255);
ALTER TABLE "songs"        ADD COLUMN IF NOT EXISTS "airtable_id" varchar(255);
ALTER TABLE "attributions" ADD COLUMN IF NOT EXISTS "airtable_id" varchar(255);
ALTER TABLE "showcases"    ADD COLUMN IF NOT EXISTS "airtable_id" varchar(255);
ALTER TABLE "expenses"     ADD COLUMN IF NOT EXISTS "airtable_id" varchar(255);
ALTER TABLE "enquiries"    ADD COLUMN IF NOT EXISTS "airtable_id" varchar(255);
ALTER TABLE "gigs"         ADD COLUMN IF NOT EXISTS "airtable_id" varchar(255);
ALTER TABLE "rehearsals"   ADD COLUMN IF NOT EXISTS "airtable_id" varchar(255);
ALTER TABLE "payments"     ADD COLUMN IF NOT EXISTS "airtable_id" varchar(255);
