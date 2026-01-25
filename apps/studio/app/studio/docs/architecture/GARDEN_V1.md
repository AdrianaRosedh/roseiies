# Roseiies Garden v1 — Architecture (Studio)

## Why this exists
Garden v1 is the foundational “Living Ingredient System” in Roseiies.
It is not a map. It is shared workplace truth with multiple lenses (Studio Designer, Sheets, Tenant Viewer, AI).

Core principles:
- Workplace is the tenant boundary. No cross-workplace data. Ever.
- Stable IDs everywhere. Names/labels can change without forking truth.
- Permissions affect visibility/editing, not truth.
- AI must obey the same permissions as the UI (RLS).

---

## Current state (v1 reality)
We run a **bridge phase**:
- Studio UI still has “Garden” objects in the local store (legacy UX), but the DB truth is now under the `roseiies` schema.
- “Garden name” in Studio is **NOT** the DB area name.
  - DB area is the physical area (currently hardcoded as `"Garden"`).
  - Studio “garden name” can be “test”, “Winter 2026”, etc — those are layout labels, not areas.

---

## Data model (Supabase / Postgres)
Schema: `roseiies`

### Core permission backbone
- `roseiies.workplaces`
- `roseiies.workplace_memberships`

All domain tables include `workplace_id`.

### Canonical spatial model
- `roseiies.areas` (physical: Garden, Vineyard, etc.)
- `roseiies.layouts` (versions/seasonal snapshots, one active per area)
- `roseiies.assets` (beds/trees/structures; stable DB ids)
- `roseiies.zones` (A/B/C per asset; stable DB ids)

### Operational truth (append-only or mostly append-only)
- `roseiies.items`
- `roseiies.seed_lots`
- `roseiies.plantings`
- `roseiies.care_events`
- `roseiies.issue_events`
- `roseiies.harvest_events`

---

## Bridge rules (important)
We bridge canvas ids → DB assets:
- `assets.tags` includes `canvas:<CANVAS_ITEM_ID>`
- Plantings are returned to the UI as:
  - `bed_id = <CANVAS_ITEM_ID>` (derived from asset.tags)
  - `zone_code = zones.code`

This allows:
- Sheets + Designer + Tenant Viewer to all work without immediately rewriting Studio’s internal doc model.

---

## Key API endpoints (Studio)
### `GET /api/garden-context`
Resolves the active DB context for a physical area:
- Input: `workplaceSlug` (currently `olivea`) + `areaName` (currently `"Garden"`)
- Output:
  - `workplaceId`
  - `areaId`
  - `layoutId` (active)

This endpoint is the anchor. It replaces gardenName-based DB lookups.

### `GET /api/plantings?layoutId=...`
Returns:
- `{ context, rows }`
Rows are UI-friendly:
- `bed_id` is canvas item id (derived)
- `zone_code` is zone code (A/B/...)

### `POST /api/plantings`
Creates planting in `roseiies.plantings`.
Bridge behavior:
- Creates/ensures `items` (by crop slug)
- Creates/ensures `assets` stub if it doesn’t exist yet (tagged with `canvas:<id>`)
- Creates/ensures `zones` by `zone_code`

### `PATCH /api/plantings?id=...`
Updates planting.
If user changes bed/zone/crop, converts to canonical ids.

### `POST /api/publish-garden-layout`
Canonicalizes the canvas doc into DB truth:
- Ensures `areas`, `layouts` (activates one layout for area)
- Upserts `assets` for every canvas item (with tags: `canvas:<id>`)
- Upserts `zones` for beds based on `item.meta.zones`

---

## Realtime model
### Source of truth for realtime:
- schema: `roseiies`
- table: `plantings`
- filter: `workplace_id=eq.<workplaceId>`

Studio Designer and Sheets subscribe to `roseiies.plantings` and refresh rows from `/api/plantings?layoutId=...` on events (simple + reliable during bridge).

---

## UI lenses
### 1) Designer (Canvas / Inspector)
- Renders beds/trees from the canvas doc.
- Overlays plantings by `bed_id === canvasItem.id`.
- Inspector “Plantings” panel filters by selected bed id.

### 2) Sheets (Grid)
- Staff-friendly CRUD lens.
- “Bed / Tree” column must store the **canvas id** (not label).
- “Zone” column options depend on the selected bed’s zones.

---

## Known footguns (documented on purpose)
1) Area vs Studio garden name
- DB area is `"Garden"` (hardcoded for now).
- Studio garden labels must NOT be passed into `/api/garden-context`.

2) Plantings not showing on map
Usually caused by:
- StudioShell still listening to old `public.garden_plantings` (must listen to `roseiies.plantings`)
- Row `bed_id` being a label string instead of a canvas id

3) Zones disappearing
If bed has no zones defined:
- do NOT null zone_code; keep it. Only validate when zones exist.

---

## Next upgrades (after bridge stabilizes)
- Add `assets.external_id` column (instead of tags parsing)
- Introduce multi-area properly (Garden vs Vineyard)
- Add “Add planting to this bed” action from Inspector (Option B workflow)
- Tenant Viewer reads published layout from `roseiies.assets` instead of legacy tables
- AI “life story” query implementation using RLS-safe reads
