-- docs/architecture/SEED_OLIVEA_GARDEN_v1.sql
-- Seed Olivea workplace + garden domain bootstrap.

-- ----------------------------
-- Create org (portfolio container)
-- ----------------------------
insert into orgs (id, name)
values (gen_random_uuid(), 'Olivea Group')
on conflict do nothing;

-- Get org_id
with org_cte as (
  select id as org_id from orgs where name = 'Olivea Group' limit 1
),
wp_cte as (
  insert into workplaces (id, org_id, name, timezone)
  select gen_random_uuid(), org_cte.org_id, 'Olivea', 'America/Mexico_City'
  from org_cte
  returning id as workplace_id
)
select * from wp_cte;

-- ----------------------------
-- Create identities
-- ----------------------------
with wp as (
  select id as workplace_id from workplaces where name='Olivea' order by created_at desc limit 1
)
insert into identities (id, workplace_id, type, name)
select gen_random_uuid(), wp.workplace_id, 'restaurant', 'Restaurant' from wp
union all
select gen_random_uuid(), wp.workplace_id, 'hotel', 'Hotel' from wp
union all
select gen_random_uuid(), wp.workplace_id, 'cafe', 'Café' from wp
on conflict do nothing;

-- ----------------------------
-- Enable apps (workplace-level)
-- ----------------------------
with wp as (
  select id as workplace_id from workplaces where name='Olivea' order by created_at desc limit 1
)
insert into workplace_apps (workplace_id, app, enabled, config)
select wp.workplace_id, 'garden', true, '{}'::jsonb from wp
union all select wp.workplace_id, 'inventory', true, '{}'::jsonb from wp
union all select wp.workplace_id, 'costing', true, '{}'::jsonb from wp
union all select wp.workplace_id, 'branding', true, '{}'::jsonb from wp
union all select wp.workplace_id, 'vineyard', false, '{}'::jsonb from wp
on conflict (workplace_id, app) do update set enabled = excluded.enabled;

-- ----------------------------
-- Create shared Garden area (identity_id = null => shared)
-- ----------------------------
with wp as (
  select id as workplace_id from workplaces where name='Olivea' order by created_at desc limit 1
)
insert into areas (id, workplace_id, identity_id, type, name)
select gen_random_uuid(), wp.workplace_id, null, 'growing', 'Garden'
from wp
on conflict do nothing;

-- ----------------------------
-- Create default layout for the Garden
-- ----------------------------
with wp as (
  select id as workplace_id from workplaces where name='Olivea' order by created_at desc limit 1
),
ar as (
  select id as area_id from areas
  where workplace_id = (select workplace_id from wp)
    and name = 'Garden'
  order by created_at desc
  limit 1
)
insert into layouts (id, workplace_id, area_id, name, canvas_w, canvas_h)
select gen_random_uuid(), (select workplace_id from wp), ar.area_id, 'Current', 1700, 1855
from ar
on conflict do nothing;

-- ----------------------------
-- Create some canonical items (produce)
-- ----------------------------
with wp as (
  select id as workplace_id from workplaces where name='Olivea' order by created_at desc limit 1
)
insert into items (id, workplace_id, type, name, aliases, unit, meta)
select gen_random_uuid(), wp.workplace_id, 'produce', 'Tomato', array['jitomate','tomate'], 'kg', '{}'::jsonb from wp
union all select gen_random_uuid(), wp.workplace_id, 'produce', 'Arugula', array['rúcula'], 'bunch', '{}'::jsonb from wp
union all select gen_random_uuid(), wp.workplace_id, 'produce', 'Basil', array['albahaca'], 'bunch', '{}'::jsonb from wp
on conflict do nothing;

-- ----------------------------
-- Create sample seed lots (count + weight)
-- ----------------------------
with wp as (
  select id as workplace_id from workplaces where name='Olivea' order by created_at desc limit 1
),
it as (
  select id as item_id, name from items
  where workplace_id = (select workplace_id from wp)
)
insert into seed_lots (
  id, workplace_id, item_id,
  supplier_name, variety, unit,
  qty_count_total, qty_count_remaining,
  cost_total, currency, purchased_at,
  meta
)
select gen_random_uuid(), (select workplace_id from wp), (select item_id from it where name='Tomato' limit 1),
       'Johnny Seeds', 'Heirloom Mix', 'count',
       200, 200,
       420.00, 'MXN', current_date,
       '{}'::jsonb
union all
select gen_random_uuid(), (select workplace_id from wp), (select item_id from it where name='Arugula' limit 1),
       'Local Supplier', 'Arugula Wild', 'weight',
       null, null,
       180.00, 'MXN', current_date,
       jsonb_build_object('notes','weight-based lot')
;

-- ----------------------------
-- Create sample assets (beds) in the Garden layout
-- ----------------------------
with wp as (
  select id as workplace_id from workplaces where name='Olivea' order by created_at desc limit 1
),
ar as (
  select id as area_id from areas
  where workplace_id = (select workplace_id from wp)
    and name = 'Garden'
  order by created_at desc
  limit 1
),
ly as (
  select id as layout_id from layouts
  where workplace_id = (select workplace_id from wp)
    and area_id = (select area_id from ar)
  order by created_at desc
  limit 1
)
insert into assets (id, workplace_id, area_id, layout_id, type, x, y, w, h, r, code, label, meta, style, order_index)
select gen_random_uuid(), (select workplace_id from wp), (select area_id from ar), (select layout_id from ly),
       'bed', 140, 220, 420, 160, 0, 'BED-001', null, '{}'::jsonb, '{}'::jsonb, 1
union all
select gen_random_uuid(), (select workplace_id from wp), (select area_id from ar), (select layout_id from ly),
       'bed', 620, 220, 420, 160, 0, 'BED-002', null, '{}'::jsonb, '{}'::jsonb, 2
;

-- ----------------------------
-- Create zones for BED-001 (A/B/C/D)
-- ----------------------------
with wp as (
  select id as workplace_id from workplaces where name='Olivea' order by created_at desc limit 1
),
ar as (
  select id as area_id from areas
  where workplace_id = (select workplace_id from wp)
    and name = 'Garden'
  order by created_at desc
  limit 1
),
bed as (
  select id as asset_id from assets
  where workplace_id = (select workplace_id from wp)
    and area_id = (select area_id from ar)
    and code = 'BED-001'
  limit 1
)
insert into zones (id, workplace_id, area_id, asset_id, code, x, y, w, h)
select gen_random_uuid(), (select workplace_id from wp), (select area_id from ar), (select asset_id from bed), 'A', 0.00, 0.00, 0.50, 0.50
union all
select gen_random_uuid(), (select workplace_id from wp), (select area_id from ar), (select asset_id from bed), 'B', 0.50, 0.00, 0.50, 0.50
union all
select gen_random_uuid(), (select workplace_id from wp), (select area_id from ar), (select asset_id from bed), 'C', 0.00, 0.50, 0.50, 0.50
union all
select gen_random_uuid(), (select workplace_id from wp), (select area_id from ar), (select asset_id from bed), 'D', 0.50, 0.50, 0.50, 0.50
on conflict do nothing;

-- ----------------------------
-- Optional: create one planting + harvest to validate end-to-end
-- ----------------------------
-- (Comment out if you want empty operational records)

with wp as (
  select id as workplace_id from workplaces where name='Olivea' order by created_at desc limit 1
),
ar as (
  select id as area_id from areas
  where workplace_id = (select workplace_id from wp)
    and name = 'Garden'
  order by created_at desc
  limit 1
),
bed as (
  select id as asset_id from assets
  where workplace_id = (select workplace_id from wp)
    and area_id = (select area_id from ar)
    and code = 'BED-001'
  limit 1
),
zone as (
  select id as zone_id from zones
  where asset_id = (select asset_id from bed)
    and code = 'A'
  limit 1
),
it as (
  select id as item_id from items
  where workplace_id = (select workplace_id from wp)
    and name='Tomato'
  limit 1
),
lot as (
  select id as seed_lot_id from seed_lots
  where workplace_id = (select workplace_id from wp)
  limit 1
),
pl as (
  insert into plantings (
    id, workplace_id, area_id, asset_id, zone_id, item_id, seed_lot_id,
    status, planted_at, seeds_used_count, pin_x, pin_y, meta
  )
  select gen_random_uuid(), (select workplace_id from wp), (select area_id from ar),
         (select asset_id from bed), (select zone_id from zone), (select item_id from it),
         (select seed_lot_id from lot),
         'planted', current_date, 12, 0.25, 0.25, '{}'::jsonb
  returning id as planting_id
)
insert into harvest_events (
  id, workplace_id, area_id, asset_id, zone_id, planting_id, item_id,
  occurred_at, destination, qty, unit, quality, meta
)
select gen_random_uuid(), (select workplace_id from wp), (select area_id from ar),
       (select asset_id from bed), (select zone_id from zone), (select planting_id from pl),
       (select item_id from it),
       now(), 'restaurant', 1.5, 'kg', 'A', '{}'::jsonb
;