-- Add travel cost and discount to gigs (the "account" layer)
ALTER TABLE "gigs" ADD COLUMN "travel_cost" int NOT NULL DEFAULT 0;
ALTER TABLE "gigs" ADD COLUMN "discount_percent" int NOT NULL DEFAULT 0;

-- Line items that drive billing for a gig (may differ from booked services)
CREATE TABLE "gig_line_items" (
  "id"          SERIAL PRIMARY KEY,
  "gig_id"      int NOT NULL REFERENCES "gigs" ("id") ON DELETE CASCADE,
  "description" varchar(255),
  "amount"      int
);
