# ROSEIIES_GARDEN_DOMAIN_v1.md
Garden Domain v1 — “Living Ingredients System”
Status: Draft v1 (foundation)

This document defines the Garden domain as a shared, workplace-scoped system.
It is the source-of-truth for living ingredients and their spatial + operational history.
All Garden data is shared within a workplace; users have different *permissions*, not private datasets.

---

## 0) Non-negotiable rules

### Shared workplace truth
- There is one canonical truth per `workplace_id`.
- No user-private garden data.
- Permissions affect visibility and edit capabilities only.

### Stable IDs, mutable labels
- IDs never change; names/labels can change freely.
- No record keys by name.

### Spatial is an index, not the truth
- The map helps locate, visualize, and navigate.
- Operational truth lives in records (plantings, harvests, care, issues).

### Additive evolution
- Use `meta jsonb` for early experimentation.
- Promote stable fields into columns/tables only when the workflow stabilizes.

---

## 1) Mental model (what Garden “is”)
Garden is not a “map app” and not a “sheet app”.
Garden is a living ingredient operating system:

### Four lenses (one shared system)
1) **Biology** — seed → planting → growth → harvest
2) **Spatial** — where it is (area/layout/asset/zone)
3) **Cost inputs** — water, labor, materials (care events)
4) **Narrative** — tenant/kitchen-friendly story and usage context

---

## 2) Core entity graph (canonical)

### Workplace (tenant boundary)
- workplace_id is on everything
- no cross-workplace mixing

### Area (where life happens)
Represents a physical/operational place:
- Garden
- Vineyard Block A
- Orchard
- Greenhouse

**Area is shared by default** (identity_id null) for Olivea.
Identity filtering is a view layer.

### Layout (versioned map)
A versioned canvas for an area:
- “Winter 2026”
- “Spring 2026”

A layout contains assets.

### Asset (node on the map)
A physical container or object:
- bed
- tree
- structure
- path

Assets are stable.
Plantings are contents.

### Zone (stable subregion of an asset)
Used to subdivide a bed into A/B/C etc.
- UI shows `code` (A, B, C)
- DB stores stable `zone_id`

Records reference `zone_id`, not “A”.

### Item (canonical vegetable/ingredient)
A canonical “thing” layer shared across apps:
- Garden: vegetable
- Inventory: SKU
- Costing: ingredient
- Menu: recipe component
- Branding: story subject

Garden never stores crop names as free text canonical truth.
It stores `item_id`.

---

## 3) Operational record graph (truth over time)

### SeedLot (seed inventory + costing input)
Represents purchased seed packages:
- count OR weight OR packet
- cost_total / currency
- remaining inventory
- optional conversion hints

SeedLot is the practical v1 foundation for “seed → vegetable branch”.

### Planting (one lifecycle instance)
A planting is a lifecycle record:
- placed in an asset/zone
- uses seed lot optionally
- has timestamps and status
- can fail without deletion

A planting can produce multiple harvest events.

### CareEvent (inputs)
Events that represent labor and resources:
- watering (liters)
- compost/fertilizer
- pruning/weeding/transplant
- labor minutes, actor

These events are the primary driver of garden costing.

### IssueEvent (problems)
Events like:
- disease
- pests
- frost/heat damage
- nutrient deficiencies

Issues are important both for learning and future AI.

### HarvestEvent (outputs)
Harvest is its own record:
- quantity
- unit
- quality
- destination (restaurant/cafe/compost/waste)
- links to planting if known

Harvest drives:
- kitchen availability
- inventory movements
- garden yield performance
- cost per unit

---

## 4) Data relationships (diagram)

Canonical graph:
Workplace
  └─ Areas (Garden/Vineyard/etc)
       └─ Layouts (Winter 2026)
            └─ Assets (beds/trees)
                 └─ Zones (A/B/C)

Canonical shared item library:
Workplace
  └─ Items (Tomato, Arugula, Basil...)

Seed inventory:
Workplace
  └─ SeedLots (item_id + inventory + cost)

Operational records:
Workplace
  ├─ Plantings (area_id + asset_id + zone_id + item_id + seed_lot_id?)
  ├─ CareEvents (area/asset/zone/planting + labor + resources)
  ├─ IssueEvents (area/asset/zone/planting + severity + notes)
  └─ HarvestEvents (area/asset/zone + item_id + qty + destination + planting?)

---

## 5) UX surfaces (what users see)

### Admin Studio (Garden team / managers)
- Design map (assets/zones)
- Log plantings
- Log care + issues + harvest
- View costing trajectory and performance by area/asset/item

### Kitchen (non-admin)
- Read-only map with overlays (where to find it)
- Availability view (“what can be used today/this week”)
- Preparation / usage notes (later: from items/meta)
- Links to menu dishes that use that item (future integration)

### Tenant (public / guest)
- Read-only map + storytelling overlays
- “You are eating from here”
- No operational numbers, no internal notes

---

## 6) Permissions v1 (capability-based)
All data is shared within workplace.
Permissions determine what can be read/written and which views appear.

### Roles (templates)
- Owner
- Admin
- Garden Manager
- Garden Staff
- Kitchen
- Viewer (public/tenant lens)

### Capabilities (examples)
Garden app:
- garden.view
- garden.design_map
- garden.edit_zones
- garden.log_planting
- garden.log_care
- garden.log_issue
- garden.log_harvest
- garden.view_costing
- garden.publish_tenant_view

Kitchen lens:
- kitchen.view_garden_map
- kitchen.view_availability
- kitchen.view_usage_notes

Tenant lens:
- tenant.view_garden_story

**Rule:** AI uses the same permissions.

---

## 7) AI modes (Garden-specific)
AI always operates within:
(workplace_id, user permissions, app context, selection context)

### Garden AI modes
1) **Map mode** (when in map, asset selected)
   - “what’s here, what’s planted, where is it”

2) **Cultivation mode** (garden staff)
   - “what care is due, what issues are emerging”

3) **Kitchen mode** (kitchen role)
   - “what can we use, how to use it, where to find it”

4) **Admin insight mode** (admin/owner)
   - “yield vs inputs, cost per unit, seasonal trajectory, risk signals”

AI never exceeds user permissions and never crosses workplaces.

---

## 8) Public view publishing model
Tenant/public view is derived from the same data, filtered by:
- workplace settings
- area settings
- role permissions
- “publish toggles” (e.g., asset.meta.public, item.meta.public_story)

Publishing is not data duplication.
It is a policy + filtered view.

---

## 9) Additive roadmap (Garden)
v1 (now)
- Area/Layout/Asset/Zone
- Items
- SeedLots
- Plantings
- HarvestEvents
- CareEvents
- IssueEvents
- Map overlays

v1.1
- Inventory integration: harvest → inventory moves
- Kitchen availability derived view
- Item imagery + usage notes

v1.2
- Seasonal summaries and comparisons
- Weather integration and correlation
- Compost batch tracking (material lots)

v2
- Genetics/Variety layer (optional)
- Advanced forecasting (yield prediction)
- Automated irrigation telemetry

---

## 10) Implementation notes (for builders)
- Do not create “gardenName” keys anywhere.
- Area rename should never fork data.
- Use stable UUIDs for all IDs.
- Prefer soft-delete for operational records.
- Log writes to activity_events for audit + recovery + AI memory.

End.