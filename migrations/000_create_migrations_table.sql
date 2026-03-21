-- Migration: create the _migrations tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id         SERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
