-- Create required extension for gen_random_bytes()/gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
DO $$ BEGIN
  CREATE TYPE "VisualIdType" AS ENUM ('zip_tie', 'leg_band', 'metal_band', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChickenSex" AS ENUM ('rooster', 'hen', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChickenStatus" AS ENUM ('alive', 'sold', 'deceased');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrgRole" AS ENUM ('owner', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MembershipStatus" AS ENUM ('invited', 'active');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- A short, human-friendly code. Collision is possible but unlikely; app should retry on unique constraint failure.
CREATE OR REPLACE FUNCTION generate_unique_code()
RETURNS text
LANGUAGE sql
AS $$
  SELECT upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
$$;

-- Tables
CREATE TABLE IF NOT EXISTS "organization" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app_user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
  "name" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "organization_membership" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
  "role" "OrgRole" NOT NULL DEFAULT 'member',
  "status" "MembershipStatus" NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "organization_membership_org_user_unique" UNIQUE ("organization_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "organization_membership_organization_id_idx" ON "organization_membership"("organization_id");
CREATE INDEX IF NOT EXISTS "organization_membership_user_id_idx" ON "organization_membership"("user_id");

CREATE TABLE IF NOT EXISTS "coop_location" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "coop_location_org_id_unique" UNIQUE ("organization_id", "id"),
  CONSTRAINT "coop_location_org_name_unique" UNIQUE ("organization_id", "name")
);

CREATE INDEX IF NOT EXISTS "coop_location_organization_id_idx" ON "coop_location"("organization_id");

CREATE TABLE IF NOT EXISTS "chicken" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "unique_code" varchar(12) NOT NULL DEFAULT generate_unique_code(),
  "visual_id_type" "VisualIdType" NOT NULL,
  "visual_id_color" text NOT NULL,
  "visual_id_number" text NOT NULL,
  "breed_primary" text NOT NULL,
  "breed_secondary" text,
  "sex" "ChickenSex" NOT NULL,
  "hatch_date" date,
  "sire_id" uuid,
  "dam_id" uuid,
  "color_traits" jsonb,
  "status" "ChickenStatus" NOT NULL,
  "status_date" date,
  "coop_location_id" uuid,
  "coop_location_name" text,
  "notes" text,
  "deleted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chicken_org_id_unique" UNIQUE ("organization_id", "id"),
  CONSTRAINT "chicken_org_unique_code_unique" UNIQUE ("organization_id", "unique_code")
);

-- Enforce same-org coop links using composite foreign keys
ALTER TABLE "chicken"
  ADD CONSTRAINT "chicken_coop_location_same_org_fk"
  FOREIGN KEY ("organization_id", "coop_location_id")
  REFERENCES "coop_location"("organization_id", "id")
  ON DELETE SET NULL;

-- Enforce same-org parent links using composite foreign keys
ALTER TABLE "chicken"
  ADD CONSTRAINT "chicken_sire_same_org_fk"
  FOREIGN KEY ("organization_id", "sire_id")
  REFERENCES "chicken"("organization_id", "id")
  ON DELETE SET NULL;

ALTER TABLE "chicken"
  ADD CONSTRAINT "chicken_dam_same_org_fk"
  FOREIGN KEY ("organization_id", "dam_id")
  REFERENCES "chicken"("organization_id", "id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "chicken_organization_id_idx" ON "chicken"("organization_id");
CREATE INDEX IF NOT EXISTS "chicken_status_idx" ON "chicken"("status");
CREATE INDEX IF NOT EXISTS "chicken_unique_code_idx" ON "chicken"("unique_code");
CREATE INDEX IF NOT EXISTS "chicken_org_status_idx" ON "chicken"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "chicken_org_deleted_at_idx" ON "chicken"("organization_id", "deleted_at");

CREATE TABLE IF NOT EXISTS "breeding_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "sire_id" uuid NOT NULL,
  "dam_id" uuid NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Enforce same-org breeding links via composite FKs
ALTER TABLE "breeding_event"
  ADD CONSTRAINT "breeding_event_sire_same_org_fk"
  FOREIGN KEY ("organization_id", "sire_id")
  REFERENCES "chicken"("organization_id", "id")
  ON DELETE RESTRICT;

ALTER TABLE "breeding_event"
  ADD CONSTRAINT "breeding_event_dam_same_org_fk"
  FOREIGN KEY ("organization_id", "dam_id")
  REFERENCES "chicken"("organization_id", "id")
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "breeding_event_organization_id_idx" ON "breeding_event"("organization_id");
CREATE INDEX IF NOT EXISTS "breeding_event_org_start_date_idx" ON "breeding_event"("organization_id", "start_date");


