


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "roseiies";


ALTER SCHEMA "roseiies" OWNER TO "postgres";


CREATE TYPE "roseiies"."care_event_type" AS ENUM (
    'watering',
    'compost',
    'fertilize',
    'prune',
    'labor',
    'other'
);


ALTER TYPE "roseiies"."care_event_type" OWNER TO "postgres";


CREATE TYPE "roseiies"."issue_event_type" AS ENUM (
    'pest',
    'disease',
    'frost',
    'heat',
    'wind',
    'nutrient',
    'other'
);


ALTER TYPE "roseiies"."issue_event_type" OWNER TO "postgres";


CREATE TYPE "roseiies"."planting_status" AS ENUM (
    'planned',
    'active',
    'harvested',
    'failed',
    'archived'
);


ALTER TYPE "roseiies"."planting_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "roseiies"."can_edit_garden"("wid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'roseiies', 'public'
    AS $$
  select exists (
    select 1
    from roseiies.workplace_memberships m
    where m.workplace_id = wid
      and m.user_id = auth.uid()
      and m.can_edit_garden = true
  );
$$;


ALTER FUNCTION "roseiies"."can_edit_garden"("wid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "roseiies"."is_member_of_workplace"("wid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'roseiies', 'public'
    AS $$
  select exists (
    select 1
    from roseiies.workplace_memberships m
    where m.workplace_id = wid
      and m.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "roseiies"."is_member_of_workplace"("wid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "roseiies"."tg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


ALTER FUNCTION "roseiies"."tg_set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "roseiies"."areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workplace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "kind" "text" DEFAULT 'garden'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "roseiies"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workplace_id" "uuid" NOT NULL,
    "area_id" "uuid" NOT NULL,
    "layout_id" "uuid",
    "type" "text" NOT NULL,
    "name" "text",
    "tags" "text"[],
    "geom" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "style" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "roseiies"."care_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workplace_id" "uuid" NOT NULL,
    "planting_id" "uuid",
    "asset_id" "uuid",
    "zone_id" "uuid",
    "type" "roseiies"."care_event_type" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "labor_minutes" integer,
    "water_liters" numeric,
    "material_cost" numeric,
    "currency" "text" DEFAULT 'MXN'::"text",
    "notes" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."care_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "roseiies"."harvest_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workplace_id" "uuid" NOT NULL,
    "planting_id" "uuid",
    "item_id" "uuid" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quantity" numeric DEFAULT 0 NOT NULL,
    "unit" "text" DEFAULT 'kg'::"text" NOT NULL,
    "destination" "text",
    "notes" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."harvest_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "roseiies"."issue_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workplace_id" "uuid" NOT NULL,
    "planting_id" "uuid",
    "asset_id" "uuid",
    "zone_id" "uuid",
    "type" "roseiies"."issue_event_type" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "severity" integer,
    "notes" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."issue_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "roseiies"."items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workplace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "category" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "roseiies"."layouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workplace_id" "uuid" NOT NULL,
    "area_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "doc_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."layouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "roseiies"."plantings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workplace_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "seed_lot_id" "uuid",
    "area_id" "uuid" NOT NULL,
    "asset_id" "uuid",
    "zone_id" "uuid",
    "pin_x" numeric,
    "pin_y" numeric,
    "planted_at" "date",
    "status" "roseiies"."planting_status" DEFAULT 'active'::"roseiies"."planting_status" NOT NULL,
    "failed_reason" "text",
    "notes_garden" "text",
    "notes_kitchen" "text",
    "notes_guest" "text",
    "guest_visible" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."plantings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "roseiies"."seed_lots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workplace_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "supplier" "text",
    "lot_code" "text",
    "purchased_at" "date",
    "unit" "text" NOT NULL,
    "quantity" numeric DEFAULT 0 NOT NULL,
    "unit_cost" numeric,
    "currency" "text" DEFAULT 'MXN'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."seed_lots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "roseiies"."workplace_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workplace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "can_edit_garden" boolean DEFAULT false NOT NULL,
    "can_manage_members" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."workplace_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "roseiies"."workplaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."workplaces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "roseiies"."zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workplace_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text",
    "geom" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "roseiies"."zones" OWNER TO "postgres";


ALTER TABLE ONLY "roseiies"."areas"
    ADD CONSTRAINT "areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "roseiies"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "roseiies"."care_events"
    ADD CONSTRAINT "care_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "roseiies"."harvest_events"
    ADD CONSTRAINT "harvest_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "roseiies"."issue_events"
    ADD CONSTRAINT "issue_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "roseiies"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "roseiies"."items"
    ADD CONSTRAINT "items_workplace_id_slug_key" UNIQUE ("workplace_id", "slug");



ALTER TABLE ONLY "roseiies"."layouts"
    ADD CONSTRAINT "layouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "roseiies"."plantings"
    ADD CONSTRAINT "plantings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "roseiies"."seed_lots"
    ADD CONSTRAINT "seed_lots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "roseiies"."workplace_memberships"
    ADD CONSTRAINT "workplace_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "roseiies"."workplace_memberships"
    ADD CONSTRAINT "workplace_memberships_workplace_id_user_id_key" UNIQUE ("workplace_id", "user_id");



ALTER TABLE ONLY "roseiies"."workplaces"
    ADD CONSTRAINT "workplaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "roseiies"."workplaces"
    ADD CONSTRAINT "workplaces_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "roseiies"."zones"
    ADD CONSTRAINT "zones_asset_id_code_key" UNIQUE ("asset_id", "code");



ALTER TABLE ONLY "roseiies"."zones"
    ADD CONSTRAINT "zones_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_areas_workplace" ON "roseiies"."areas" USING "btree" ("workplace_id");



CREATE INDEX "idx_assets_area" ON "roseiies"."assets" USING "btree" ("area_id");



CREATE INDEX "idx_assets_layout" ON "roseiies"."assets" USING "btree" ("layout_id");



CREATE INDEX "idx_assets_workplace" ON "roseiies"."assets" USING "btree" ("workplace_id");



CREATE INDEX "idx_care_planting" ON "roseiies"."care_events" USING "btree" ("planting_id");



CREATE INDEX "idx_care_workplace" ON "roseiies"."care_events" USING "btree" ("workplace_id");



CREATE INDEX "idx_harvest_item" ON "roseiies"."harvest_events" USING "btree" ("item_id");



CREATE INDEX "idx_harvest_workplace" ON "roseiies"."harvest_events" USING "btree" ("workplace_id");



CREATE INDEX "idx_issue_planting" ON "roseiies"."issue_events" USING "btree" ("planting_id");



CREATE INDEX "idx_issue_workplace" ON "roseiies"."issue_events" USING "btree" ("workplace_id");



CREATE INDEX "idx_items_workplace" ON "roseiies"."items" USING "btree" ("workplace_id");



CREATE INDEX "idx_layouts_area" ON "roseiies"."layouts" USING "btree" ("area_id");



CREATE INDEX "idx_layouts_workplace" ON "roseiies"."layouts" USING "btree" ("workplace_id");



CREATE INDEX "idx_memberships_user" ON "roseiies"."workplace_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_memberships_workplace" ON "roseiies"."workplace_memberships" USING "btree" ("workplace_id");



CREATE INDEX "idx_plantings_asset" ON "roseiies"."plantings" USING "btree" ("asset_id");



CREATE INDEX "idx_plantings_item" ON "roseiies"."plantings" USING "btree" ("item_id");



CREATE INDEX "idx_plantings_workplace" ON "roseiies"."plantings" USING "btree" ("workplace_id");



CREATE INDEX "idx_seedlots_item" ON "roseiies"."seed_lots" USING "btree" ("item_id");



CREATE INDEX "idx_seedlots_workplace" ON "roseiies"."seed_lots" USING "btree" ("workplace_id");



CREATE INDEX "idx_zones_asset" ON "roseiies"."zones" USING "btree" ("asset_id");



CREATE INDEX "idx_zones_workplace" ON "roseiies"."zones" USING "btree" ("workplace_id");



CREATE OR REPLACE TRIGGER "tg_areas_updated_at" BEFORE UPDATE ON "roseiies"."areas" FOR EACH ROW EXECUTE FUNCTION "roseiies"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "tg_assets_updated_at" BEFORE UPDATE ON "roseiies"."assets" FOR EACH ROW EXECUTE FUNCTION "roseiies"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "tg_items_updated_at" BEFORE UPDATE ON "roseiies"."items" FOR EACH ROW EXECUTE FUNCTION "roseiies"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "tg_layouts_updated_at" BEFORE UPDATE ON "roseiies"."layouts" FOR EACH ROW EXECUTE FUNCTION "roseiies"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "tg_memberships_updated_at" BEFORE UPDATE ON "roseiies"."workplace_memberships" FOR EACH ROW EXECUTE FUNCTION "roseiies"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "tg_plantings_updated_at" BEFORE UPDATE ON "roseiies"."plantings" FOR EACH ROW EXECUTE FUNCTION "roseiies"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "tg_seedlots_updated_at" BEFORE UPDATE ON "roseiies"."seed_lots" FOR EACH ROW EXECUTE FUNCTION "roseiies"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "tg_workplaces_updated_at" BEFORE UPDATE ON "roseiies"."workplaces" FOR EACH ROW EXECUTE FUNCTION "roseiies"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "tg_zones_updated_at" BEFORE UPDATE ON "roseiies"."zones" FOR EACH ROW EXECUTE FUNCTION "roseiies"."tg_set_updated_at"();



ALTER TABLE ONLY "roseiies"."areas"
    ADD CONSTRAINT "areas_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "roseiies"."workplaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."assets"
    ADD CONSTRAINT "assets_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "roseiies"."areas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."assets"
    ADD CONSTRAINT "assets_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "roseiies"."layouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "roseiies"."assets"
    ADD CONSTRAINT "assets_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "roseiies"."workplaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."care_events"
    ADD CONSTRAINT "care_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "roseiies"."assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "roseiies"."care_events"
    ADD CONSTRAINT "care_events_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "roseiies"."plantings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "roseiies"."care_events"
    ADD CONSTRAINT "care_events_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "roseiies"."workplaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."care_events"
    ADD CONSTRAINT "care_events_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "roseiies"."zones"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "roseiies"."harvest_events"
    ADD CONSTRAINT "harvest_events_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "roseiies"."items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "roseiies"."harvest_events"
    ADD CONSTRAINT "harvest_events_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "roseiies"."plantings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "roseiies"."harvest_events"
    ADD CONSTRAINT "harvest_events_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "roseiies"."workplaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."issue_events"
    ADD CONSTRAINT "issue_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "roseiies"."assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "roseiies"."issue_events"
    ADD CONSTRAINT "issue_events_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "roseiies"."plantings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "roseiies"."issue_events"
    ADD CONSTRAINT "issue_events_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "roseiies"."workplaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."issue_events"
    ADD CONSTRAINT "issue_events_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "roseiies"."zones"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "roseiies"."items"
    ADD CONSTRAINT "items_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "roseiies"."workplaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."layouts"
    ADD CONSTRAINT "layouts_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "roseiies"."areas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."layouts"
    ADD CONSTRAINT "layouts_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "roseiies"."workplaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."plantings"
    ADD CONSTRAINT "plantings_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "roseiies"."areas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "roseiies"."plantings"
    ADD CONSTRAINT "plantings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "roseiies"."assets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "roseiies"."plantings"
    ADD CONSTRAINT "plantings_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "roseiies"."items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "roseiies"."plantings"
    ADD CONSTRAINT "plantings_seed_lot_id_fkey" FOREIGN KEY ("seed_lot_id") REFERENCES "roseiies"."seed_lots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "roseiies"."plantings"
    ADD CONSTRAINT "plantings_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "roseiies"."workplaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."plantings"
    ADD CONSTRAINT "plantings_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "roseiies"."zones"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "roseiies"."seed_lots"
    ADD CONSTRAINT "seed_lots_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "roseiies"."items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "roseiies"."seed_lots"
    ADD CONSTRAINT "seed_lots_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "roseiies"."workplaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."workplace_memberships"
    ADD CONSTRAINT "workplace_memberships_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "roseiies"."workplaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."zones"
    ADD CONSTRAINT "zones_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "roseiies"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "roseiies"."zones"
    ADD CONSTRAINT "zones_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "roseiies"."workplaces"("id") ON DELETE CASCADE;



ALTER TABLE "roseiies"."areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "areas_insert" ON "roseiies"."areas" FOR INSERT TO "authenticated" WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



CREATE POLICY "areas_select" ON "roseiies"."areas" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("workplace_id"));



CREATE POLICY "areas_update" ON "roseiies"."areas" FOR UPDATE TO "authenticated" USING ("roseiies"."can_edit_garden"("workplace_id")) WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



ALTER TABLE "roseiies"."assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assets_insert" ON "roseiies"."assets" FOR INSERT TO "authenticated" WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



CREATE POLICY "assets_select" ON "roseiies"."assets" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("workplace_id"));



CREATE POLICY "assets_update" ON "roseiies"."assets" FOR UPDATE TO "authenticated" USING ("roseiies"."can_edit_garden"("workplace_id")) WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



ALTER TABLE "roseiies"."care_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "care_events_insert" ON "roseiies"."care_events" FOR INSERT TO "authenticated" WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



CREATE POLICY "care_events_no_delete" ON "roseiies"."care_events" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "care_events_no_update" ON "roseiies"."care_events" FOR UPDATE TO "authenticated" USING (false);



CREATE POLICY "care_events_select" ON "roseiies"."care_events" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("workplace_id"));



ALTER TABLE "roseiies"."harvest_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "harvest_events_insert" ON "roseiies"."harvest_events" FOR INSERT TO "authenticated" WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



CREATE POLICY "harvest_events_no_delete" ON "roseiies"."harvest_events" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "harvest_events_no_update" ON "roseiies"."harvest_events" FOR UPDATE TO "authenticated" USING (false);



CREATE POLICY "harvest_events_select" ON "roseiies"."harvest_events" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("workplace_id"));



ALTER TABLE "roseiies"."issue_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "issue_events_insert" ON "roseiies"."issue_events" FOR INSERT TO "authenticated" WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



CREATE POLICY "issue_events_no_delete" ON "roseiies"."issue_events" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "issue_events_no_update" ON "roseiies"."issue_events" FOR UPDATE TO "authenticated" USING (false);



CREATE POLICY "issue_events_select" ON "roseiies"."issue_events" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("workplace_id"));



ALTER TABLE "roseiies"."items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "items_insert" ON "roseiies"."items" FOR INSERT TO "authenticated" WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



CREATE POLICY "items_select" ON "roseiies"."items" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("workplace_id"));



CREATE POLICY "items_update" ON "roseiies"."items" FOR UPDATE TO "authenticated" USING ("roseiies"."can_edit_garden"("workplace_id")) WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



ALTER TABLE "roseiies"."layouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "layouts_insert" ON "roseiies"."layouts" FOR INSERT TO "authenticated" WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



CREATE POLICY "layouts_select" ON "roseiies"."layouts" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("workplace_id"));



CREATE POLICY "layouts_update" ON "roseiies"."layouts" FOR UPDATE TO "authenticated" USING ("roseiies"."can_edit_garden"("workplace_id")) WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



CREATE POLICY "memberships_mutate" ON "roseiies"."workplace_memberships" TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "memberships_select" ON "roseiies"."workplace_memberships" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("workplace_id"));



ALTER TABLE "roseiies"."plantings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plantings_insert" ON "roseiies"."plantings" FOR INSERT TO "authenticated" WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



CREATE POLICY "plantings_select" ON "roseiies"."plantings" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("workplace_id"));



CREATE POLICY "plantings_update" ON "roseiies"."plantings" FOR UPDATE TO "authenticated" USING ("roseiies"."can_edit_garden"("workplace_id")) WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



ALTER TABLE "roseiies"."seed_lots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seed_lots_insert" ON "roseiies"."seed_lots" FOR INSERT TO "authenticated" WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



CREATE POLICY "seed_lots_select" ON "roseiies"."seed_lots" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("workplace_id"));



CREATE POLICY "seed_lots_update" ON "roseiies"."seed_lots" FOR UPDATE TO "authenticated" USING ("roseiies"."can_edit_garden"("workplace_id")) WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



ALTER TABLE "roseiies"."workplace_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "roseiies"."workplaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workplaces_insert" ON "roseiies"."workplaces" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "workplaces_select" ON "roseiies"."workplaces" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("id"));



CREATE POLICY "workplaces_update" ON "roseiies"."workplaces" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "roseiies"."zones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "zones_insert" ON "roseiies"."zones" FOR INSERT TO "authenticated" WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



CREATE POLICY "zones_select" ON "roseiies"."zones" FOR SELECT TO "authenticated" USING ("roseiies"."is_member_of_workplace"("workplace_id"));



CREATE POLICY "zones_update" ON "roseiies"."zones" FOR UPDATE TO "authenticated" USING ("roseiies"."can_edit_garden"("workplace_id")) WITH CHECK ("roseiies"."can_edit_garden"("workplace_id"));



GRANT USAGE ON SCHEMA "roseiies" TO "anon";
GRANT USAGE ON SCHEMA "roseiies" TO "authenticated";
GRANT USAGE ON SCHEMA "roseiies" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."areas" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."areas" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."areas" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."assets" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."assets" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."assets" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."care_events" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."care_events" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."care_events" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."harvest_events" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."harvest_events" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."harvest_events" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."issue_events" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."issue_events" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."issue_events" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."items" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."items" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."items" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."layouts" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."layouts" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."layouts" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."plantings" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."plantings" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."plantings" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."seed_lots" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."seed_lots" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."seed_lots" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."workplace_memberships" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."workplace_memberships" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."workplace_memberships" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."workplaces" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."workplaces" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."workplaces" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."zones" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "roseiies"."zones" TO "service_role";
GRANT SELECT ON TABLE "roseiies"."zones" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "roseiies" GRANT SELECT ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "roseiies" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "roseiies" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "service_role";




