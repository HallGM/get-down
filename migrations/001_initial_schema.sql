-- Initial schema — generated from schema.dbml
-- To regenerate: cd packages/api && pnpm dbml:sql

CREATE TABLE "services" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar(255) UNIQUE
);

CREATE TABLE "enquiries" (
  "id" SERIAL PRIMARY KEY,
  "created_at" date,
  "first_name" varchar(255) NOT NULL,
  "last_name" varchar(255) NOT NULL,
  "partner_name" varchar(255),
  "email" varchar(255) NOT NULL,
  "phone" varchar(255),
  "event_date" date,
  "venue_location" varchar(255),
  "other_services" varchar(255)[],
  "message" text
);

CREATE TABLE "enquiries_services" (
  "id" SERIAL PRIMARY KEY,
  "service_id" int NOT NULL,
  "enquiry_id" int NOT NULL
);

ALTER TABLE "enquiries_services"
  ADD FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE;

ALTER TABLE "enquiries_services"
  ADD FOREIGN KEY ("enquiry_id") REFERENCES "enquiries" ("id") ON DELETE CASCADE;
