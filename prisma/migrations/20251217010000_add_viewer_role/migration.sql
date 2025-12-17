-- Add viewer role to OrgRole enum (PostgreSQL only supports ADD VALUE)
DO $$ BEGIN
  ALTER TYPE "OrgRole" ADD VALUE IF NOT EXISTS 'viewer';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


