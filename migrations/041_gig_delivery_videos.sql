CREATE TABLE gig_delivery_videos (
  id         serial      PRIMARY KEY,
  gig_id     integer     NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  vimeo_url  text        NOT NULL,
  position   integer     NOT NULL DEFAULT 0
);
