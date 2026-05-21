CREATE TABLE IF NOT EXISTS refunds (
  id          serial PRIMARY KEY,
  gig_id      int    NOT NULL REFERENCES gigs(id),
  date        date,
  amount      int    NOT NULL,
  method      varchar(100),
  description varchar(255)
);
