-- Add radius column to gyms table for global gym radius
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS radius INTEGER DEFAULT 200;
