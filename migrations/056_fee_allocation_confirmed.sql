-- Add confirmed column to fee_allocations table for partner fee allocation confirmation
ALTER TABLE fee_allocations ADD COLUMN confirmed boolean NOT NULL DEFAULT false;
