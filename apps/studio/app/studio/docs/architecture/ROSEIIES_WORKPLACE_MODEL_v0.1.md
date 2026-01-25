# ROSEIIES Workplace Model v0.1
Roseiies is a living operational nervous system for hospitality.

This doc defines:
- the canonical data graph
- scoping + permissions rules
- AI context behavior
- how apps operate without creating silos

---

## 0) Core belief
Hospitality professionals should never have to stop working to understand what’s happening.

Roseiies captures truth as a side-effect of work:
- always current
- searchable
- explainable
- permission-safe
- AI-ready

Roseiies is not “a reporting tool”.
It is operational awareness.

---

## 1) Tenancy & ownership

### Org (Portfolio) — future paid tier
A portfolio is a parent container for multiple Workplaces.
Used for cross-workplace rollups and (optional) shared master data.

**Not exposed in v1 UI**, but exists in DB so we don’t migrate later.

### Workplace — tenant boundary
Workplace is the primary security boundary.
- Billing boundary
- Privacy boundary
- AI memory boundary

**Rule:** No data is shared across workplaces. Ever.

### Identity — business units inside a workplace
Restaurant / Hotel / Café are Identities inside one Workplace.
Identities are:
- filters
- scopes for permissions
- reporting dimensions

Identities do not “own” data.
Data can be workplace-shared or identity-scoped by design.

---

## 2) Apps & Workplace Home

### Apps
Apps are workflows and views:
- Garden (Spatial Ops)
- Inventory
- Costing
- Branding/Storytelling
- Vineyard (future)
- Others later

Apps do not own data.
Apps operate on the shared workplace graph + operational records.

Apps are enabled per workplace (workplace_apps).

### Workplace Home (not an app)
Workplace Home is the awareness layer:
- cross-app snapshot (“what’s happening now”)
- trend trajectories (“how it’s changing over time”)
- alerts (“what needs attention”)
- AI entrypoint (“ask the workplace”)

---

## 3) The Workplace Graph (canonical entities)

### Area → Layout → Asset → Zone (Spatial Graph)
- Area: Garden, Vineyard Block, Kitchen, Storage, Rooms Wing, Spa, etc
- Layout: versioned map for an area (Winter 2026)
- Asset: any node on a layout (bed/tree/room/table/station/etc)
- Zone: stable subregion inside an asset (display A/B/C, stored as zone_id)

### Items (canonical “thing” layer)
To avoid vocabulary drift across apps:
- Garden: “vegetable”
- Inventory: “SKU”
- Costing: “ingredient”
- Menu: “recipe component”
- Branding: “story element”

We define canonical `items` early:
- stable IDs
- aliases
- units
- type

Apps reference items by ID.

---

## 4) Operational Records (facts)
Records are the truth layer (rows/events).

Examples:
- plantings
- harvest lots (future)
- inventory moves (future)
- recipe versions (future)
- tasks/checklists (future)

Records attach to canonical entities by stable IDs.

**Rename never breaks records** because names are not keys.

---

## 5) Scoping rules (non-negotiable)
Every record includes:
- workplace_id (always)
Optional:
- identity_id (when identity-specific or allocated)
- area_id / asset_id / zone_id (when spatial)

---

## 6) Permissions (v0.1)
Permissions are relevance filters, not “blocking”.

We use:
- Roles (owner, manager, editor, viewer)
- Capabilities (fine-grained rights per app)
- Grants (scope: workplace / identity / area)

Example capabilities:
- garden.design_map
- garden.log_planting
- garden.log_harvest
- inventory.adjust_stock
- costing.edit_costs
- branding.publish_story

A user sees only what they’re allowed to see, and the AI follows the same rules.

---

## 7) AI behavior (per-user portal view)
AI context is inferred from the user’s portal state.

Context stack:
1) user (role + grants)
2) workplace
3) identity filter (if selected)
4) app context (if inside an app)
5) area/asset selection (if any)
6) time window (now/today/week/month)

Defaults:
- inside an app: AI focuses on that app’s domain
- on Workplace Home: AI focuses on the whole workplace
- permissions always apply (AI never exceeds user’s access)

---

## 8) UX promises (non-tech user friendly)
- minimal setup
- clear defaults
- guided flows
- strong visual affordances
- data captured as a side-effect of normal work
- no “you must keep the database organized”

---

## 9) Design rule for new features
Before shipping:
1) What is the stable entity?
2) What is the record type?
3) What scope fields are required?
4) What permissions apply?
5) What must be soft-deleted vs hard-deleted?
6) What activity events should be logged?

If not answered, do not ship.