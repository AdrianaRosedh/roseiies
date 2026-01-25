-- docs/architecture/DB_SCHEMA_GARDEN_v1.sql
-- Garden Domain v1 (Supabase/Postgres)
-- Adds: seed_lots, care_events, issue_events, harvest_events
-- Also upgrades plantings model if needed (ensure failed status exists).

create extension if not exists "pgcrypto";

-- ----------------------------
-- Enums (create if not exists)
-- ----------------------------

do $$ begin
  create type seed_unit as enum ('count', 'weight', 'packet');
exception when duplicate_object then null; end $$;

-- planting_status already exists in the workplace schema v0.1
-- but v0.1 might not include 'failed'. Ensure it does.
do $$ begin
  alter type planting_status add value if not exists 'failed';
exception when others then null; end $$;

do $$ begin
  create type harvest_destination as enum ('restaurant', 'cafe', 'hotel', 'staff_meal', 'compost', 'waste', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type care_kind as enum ('watering', 'compost', 'fertilizer', 'pruning', 'weeding', 'mulching', 'transplant', 'inspection', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type issue_kind as enum ('disease', 'pest', 'frost', 'heat', 'nutrient_deficiency', 'overwater', 'underwater', 'damage', 'other');
exception when duplicate_object then null; end $$;

-- ----------------------------
-- Seed lots (seed inventory)
-- ----------------------------
create table if not exists seed_lots (
  id uuid primary key default gen_random_uuid(),
  workplace_id uuid not null references workplaces(id) on delete cascade,

  -- optional: identity context if you ever want cost allocation
  identity_id uuid null references identities(id) on delete set null,

  -- canonical item (vegetable)
  item_id uuid not null references items(id) on delete restrict,

  supplier_name text null,
  supplier_ref text null, -- vendor SKU / invoice ref
  variety text null,      -- e.g. "Heirloom Brandywine"
  origin text null,       -- e.g. "Italy", "Baja"

  unit seed_unit not null default 'count',

  -- inventory quantities (choose based on unit)
  qty_count_total int null,
  qty_count_remaining int null,

  qty_weight_total_g double precision null,
  qty_weight_remaining_g double precision null,

  qty_packets_total int null,
  qty_packets_remaining int null,

  -- conversion hints (optional)
  est_seeds_per_gram double precision null,
  est_seeds_per_packet int null,

  cost_total numeric(12,2) null,
  currency text not null default 'MXN',
  purchased_at date null,
  expires_at date null,

  storage_notes text null,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists seed_lots_workplace_idx on seed_lots(workplace_id);
create index if not exists seed_lots_item_idx on seed_lots(item_id);
create index if not exists seed_lots_identity_idx on seed_lots(identity_id);

-- ----------------------------
-- Plantings v1 upgrade checks
-- If you already created plantings in v0.1, this section ensures it has fields we need.
-- ----------------------------

-- Ensure plantings table exists (it should from v0.1).
-- Add seed_lot_id and seeds_used_* and failure_reason if missing.
alter table if exists plantings
  add column if not exists seed_lot_id uuid null references seed_lots(id) on delete set null;

alter table if exists plantings
  add column if not exists expected_ready_at date null;

alter table if exists plantings
  add column if not exists harvested_first_at date null;

alter table if exists plantings
  add column if not exists harvested_last_at date null;

alter table if exists plantings
  add column if not exists seeds_used_count int null;

alter table if exists plantings
  add column if not exists seeds_used_weight_g double precision null;

alter table if exists plantings
  add column if not exists seeds_used_packets int null;

alter table if exists plantings
  add column if not exists failure_reason text null;

alter table if exists plantings
  add column if not exists notes text null;

create index if not exists plantings_seed_lot_idx on plantings(seed_lot_id);

-- ----------------------------
-- Care events (inputs)
-- ----------------------------
create table if not exists care_events (
  id uuid primary key default gen_random_uuid(),
  workplace_id uuid not null references workplaces(id) on delete cascade,
  identity_id uuid null references identities(id) on delete set null,

  kind care_kind not null default 'other',

  -- attach anywhere in the spatial graph OR directly to a planting
  area_id uuid null references areas(id) on delete cascade,
  asset_id uuid null references assets(id) on delete set null,
  zone_id uuid null references zones(id) on delete set null,
  planting_id uuid null references plantings(id) on delete set null,

  occurred_at timestamptz not null default now(),

  -- water/resources
  water_liters double precision null,

  -- materials (optional)
  material_item_id uuid null references items(id) on delete set null,
  material_qty numeric(12,3) null,
  material_unit text null,

  -- labor (for costing)
  labor_minutes int null,
  labor_user_id uuid null, -- auth.users.id

  notes text null,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists care_events_workplace_idx on care_events(workplace_id);
create index if not exists care_events_identity_idx on care_events(identity_id);
create index if not exists care_events_area_idx on care_events(area_id);
create index if not exists care_events_asset_idx on care_events(asset_id);
create index if not exists care_events_zone_idx on care_events(zone_id);
create index if not exists care_events_planting_idx on care_events(planting_id);
create index if not exists care_events_occurred_idx on care_events(occurred_at);

-- ----------------------------
-- Issue events (problems)
-- ----------------------------
create table if not exists issue_events (
  id uuid primary key default gen_random_uuid(),
  workplace_id uuid not null references workplaces(id) on delete cascade,
  identity_id uuid null references identities(id) on delete set null,

  kind issue_kind not null default 'other',

  area_id uuid null references areas(id) on delete cascade,
  asset_id uuid null references assets(id) on delete set null,
  zone_id uuid null references zones(id) on delete set null,
  planting_id uuid null references plantings(id) on delete set null,

  occurred_at timestamptz not null default now(),

  severity int null, -- 1..5 optional
  action_taken text null,
  notes text null,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists issue_events_workplace_idx on issue_events(workplace_id);
create index if not exists issue_events_identity_idx on issue_events(identity_id);
create index if not exists issue_events_area_idx on issue_events(area_id);
create index if not exists issue_events_asset_idx on issue_events(asset_id);
create index if not exists issue_events_zone_idx on issue_events(zone_id);
create index if not exists issue_events_planting_idx on issue_events(planting_id);
create index if not exists issue_events_occurred_idx on issue_events(occurred_at);

-- ----------------------------
-- Harvest events (outputs)
-- ----------------------------
create table if not exists harvest_events (
  id uuid primary key default gen_random_uuid(),
  workplace_id uuid not null references workplaces(id) on delete cascade,
  identity_id uuid null references identities(id) on delete set null,

  area_id uuid not null references areas(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete restrict,
  zone_id uuid null references zones(id) on delete set null,
  planting_id uuid null references plantings(id) on delete set null,

  item_id uuid not null references items(id) on delete restrict,

  occurred_at timestamptz not null default now(),
  destination harvest_destination not null default 'other',

  qty numeric(12,3) null,
  unit text null, -- 'kg', 'each', 'bunch'
  quality text null,
  notes text null,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists harvest_events_workplace_idx on harvest_events(workplace_id);
create index if not exists harvest_events_identity_idx on harvest_events(identity_id);
create index if not exists harvest_events_area_idx on harvest_events(area_id);
create index if not exists harvest_events_asset_idx on harvest_events(asset_id);
create index if not exists harvest_events_zone_idx on harvest_events(zone_id);
create index if not exists harvest_events_item_idx on harvest_events(item_id);
create index if not exists harvest_events_occurred_idx on harvest_events(occurred_at);

-- ----------------------------
-- Optional: guardrails
-- At least one spatial pointer for care/issues/harvest should exist.
-- Enforcing via constraints can be added later when the UI stabilizes.
-- ----------------------------