-- Migration: Division FK Refactor (2026-07-10)
-- Schema DROP ALL + CREATE ulang — production full reset disetujui.
-- Perubahan:
--   divisions             → branch_divisions
--   channel_divisions     → division_channels
--   user_divisions.division (varchar) → user_divisions.division_id (FK int)
--   division_channels.division (varchar) → division_channels.division_id (FK int)
--   division_channels.branch_id → HAPUS (redundan, bisa JOIN via branch_divisions)
--   division_channels.company_id → WAJIB NOT NULL (global dihapus)

-- ─── DROP dependent objects first ─────────────────────────────────────────────

-- Hapus unique indexes
DROP INDEX IF EXISTS "uq_products_name_company";

-- Hapus tabel child (yg punya FK ke divisions/channel_divisions)
DROP TABLE IF EXISTS "user_divisions" CASCADE;
DROP TABLE IF EXISTS "division_channels" CASCADE;
DROP TABLE IF EXISTS "branch_divisions" CASCADE;

-- Hapus tabel lama (kalau masih ada)
DROP TABLE IF EXISTS "channel_divisions" CASCADE;
DROP TABLE IF EXISTS "divisions" CASCADE;

-- ─── CREATE branch_divisions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "branch_divisions" (
    "id" serial PRIMARY KEY NOT NULL,
    "company_id" integer NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "branch_id" integer REFERENCES "company_branches"("id") ON DELETE CASCADE,
    "name" varchar(100) NOT NULL,
    "code" varchar(50) NOT NULL,
    "dormant_bucket" varchar(20) DEFAULT 'b2b_dc' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "unq_division_company_branch_code" UNIQUE("company_id", "branch_id", "code")
);

-- Partial unique index untuk company-wide (branch_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS "unq_division_company_code_global"
    ON "branch_divisions" ("company_id", "code")
    WHERE "branch_id" IS NULL;

-- ─── CREATE division_channels ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "division_channels" (
    "id" serial PRIMARY KEY NOT NULL,
    "company_id" integer NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "division_id" integer NOT NULL REFERENCES "branch_divisions"("id") ON DELETE CASCADE,
    "channel_name" varchar(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── CREATE user_divisions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user_divisions" (
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "branch_id" integer NOT NULL REFERENCES "company_branches"("id") ON DELETE CASCADE,
    "division_id" integer NOT NULL REFERENCES "branch_divisions"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "user_divisions_user_id_branch_id_division_id_pk"
        PRIMARY KEY("user_id", "branch_id", "division_id")
);