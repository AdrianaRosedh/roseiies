-- docs/architecture/DB_SCHEMA_v0.1.sql
-- Roseiies Workplace Graph + Permissions v0.1 (Supabase/Postgres)
-- ✅ Rewritten to use schema: roseiies
-- ✅ Matches current implementation (workplaces + memberships + areas/layouts/assets/zones/items/plantings)
--
-- Notes:
-- - workplace is the tenant/privacy boundary (no cross-workplace mixing)
-- - stable IDs everywhere; names/labels mutable
-- - RLS is expected (policies are managed separately in code / migrations)

create schema if not exists roseiies;
create extension if not exists "pgcrypto";

-- Make all unqualified names land in roseiies
set search_path = roseiies, public;

-- ----------------------------
-- Enums (current implementation)
-- ----------------------------
do $$ begin
  create type roseiies.planting_status as enum ('planned','active','harvested','failed','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type roseiies.care_event_type as enum ('watering','compost','fertilize','prune','labor','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type roseiies.issue_event_type as enum ('pest','disease','frost','heat','wind','nutrient','other');
exception when duplicate_object then null; end $$;

-- ----------------------------
-- Workplaces (tenant boundary)
-- ----------------------------
create table if not exists roseiies.workplaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,         -- e.g. "olivea"
  name text not null,                -- e.g. "Olivea"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------
-- Memberships (permission backbone)
-- ----------------------------
create table if not exists roseiies.workplace_memberships (
  id uuid primary key default gen_random_uuid(),
  workplace_id uuid not null references roseiies.workplaces(id) on delete cascade,
  user_id uuid not null, -- auth.users.id (no FK to avoid permission issues)

  role text not null default 'member',
  can_edit_garden boolean not null default false,
  can_manage_members boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(workplace_id, user_id)
);

create index if not exists idx_memberships_user on roseiies.workplace_memberships(user_id);
create index if not exists idx_memberships_workplace on roseiies.workplace_memberships(workplace_id);

-- ----------------------------
-- Areas (physical places)
-- ----------------------------
create table if not exists roseiies.areas (
  id uuid primary key default gen_random_uuid(),
  workplace_id uuid not null references roseiies.workplaces(id) on delete cascade,

  name text not null,                -- "Garden", "Vineyard", "Greenhouse"
  kind text not null default 'garden',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_areas_workplace on roseiies.areas(workplace_id);

-- ----------------------------
-- Layouts (versioned map snapshots)
-- ----------------------------
create table if not exists roseiies.layouts (
  id uuid primary key default gen_random_uuid(),
  workplace_id uuid not null references roseiies.workplaces(id) on delete cascade,
  area_id uuid not null references roseiies.areas(id) on delete cascade,

  name text not null,                -- "Winter 2026"
  version int not null default 1,
  is_active boolean not null default true,

  -- optional: stored snapshot metadata
  doc_json jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_layouts_workplace on roseiies.layouts(workplace_id);
create index if not exists idx_layouts_area on roseiies.layouts(area_id);

-- ----------------------------
-- Assets (beds/trees/structures)
-- IMPORTANT: bridge uses tags: ["canvas:<CANVAS_ITEM_ID>"]
-- ----------------------------
create table if not exists roseiies.assets (
  id uuid primary key default gen_random_uuid(),
  workplace_id uuid not null references roseiies.workplaces(id) on delete cascade,
  area_id uuid not null references roseiies.areas(id) on delete cascade,
  layout_id uuid null references roseiies.layouts(id) on delete set null,

  type text not null,                -- "bed", "tree", "structure"
  name text,
  tags text[],

  -- canonical geometry + style (flexible json)
  geom jsonb not null default '{}'::jsonb,
  style jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assets_workplace on roseiies.assets(workplace_id);
create index if not exists idx_assets_area on roseiies.assets(area_id);
create index if not exists idx_assets_layout on roseiies.assets(layout_id);

-- ----------------------------
-- Zones (A/B/C per asset)
-- ----------------------------
create table if not exists roseiies.zones (
  id uuid primary key default gen_random_uuid(),
  workplace_id uuid not null references roseiies.workplaces(id) on delete cascade,
  asset_id uuid not null references roseiies.assets(id) on delete cascade,

  code text not null,                -- "A", "B"
  name text,
  geom jsonb,                        -- optional subdivision geometry

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(asset_id, code)
);

create index if not exists idx_zones_workplace on roseiies.zones(workplace_id);
create index if not exists idx_zones_asset on roseiies.zones(asset_id);

-- ----------------------------
-- Items (canonical ingredients)
-- slug is stable-ish; name can change without forking truth
-- ----------------------------
create table if not exists roseiies.items (
  id uuid primary key default gen_random_uuid(),
  workplace_id uuid not null references roseiies.workplaces(id) on delete cascade,

  name text not null,                -- "Tomate"
  slug text not null,                -- "tomate"
  category text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(workplace_id, slug)
);

create index if not exists idx_items_workplace on roseiies.items(workplace_id);

-- ----------------------------
-- Plantings (operational records)
-- ----------------------------
create table if not exists roseiies.plantings (
  id uuid primary key default gen_random_uuid(),
  workplace_id uuid not null references roseiies.workplaces(id) on delete cascade,

  item_id uuid not null references roseiies.items(id) on delete restrict,
  seed_lot_id uuid null, -- added in garden_v1 file (FK after seed_lots exists)

  area_id uuid not null references roseiies.areas(id) on delete restrict,
  asset_id uuid null references roseiies.assets(id) on delete restrict,
  zone_id uuid null references roseiies.zones(id) on delete set null,

  pin_x numeric,
  pin_y numeric,

  planted_at date,
  status roseiies.planting_status not null default 'active',
  failed_reason text,

  notes_garden text,
  notes_kitchen text,
  notes_guest text,
  guest_visible boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plantings_workplace on roseiies.plantings(workplace_id);
create index if not exists idx_plantings_asset on roseiies.plantings(asset_id);
create index if not exists idx_plantings_item on roseiies.plantings(item_id);