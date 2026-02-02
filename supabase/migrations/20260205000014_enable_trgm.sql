-- Migration: Enable pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
