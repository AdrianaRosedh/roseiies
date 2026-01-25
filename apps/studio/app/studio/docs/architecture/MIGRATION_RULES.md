# MIGRATION_RULES.md
Rules to keep Roseiies stable while apps evolve.

## 1) Stable IDs; names are labels
- IDs are stable and never change.
- Names, labels, and slugs can change.
- Never key data by name.

## 2) Tenant boundary
- Workplace is the privacy boundary.
- No cross-workplace data mixing.
- All queries must include workplace_id filtering (enforced via RLS).

## 3) Additive schema evolution
- Never change the meaning of an existing column.
- Prefer adding columns/tables rather than repurposing.
- Use `meta jsonb` for early experimentation, then promote stable fields into real columns.

## 4) Soft delete for critical records
Operational records should use `deleted_at` instead of hard delete.
- restore is allowed for admins
- protects against accidental deletes and buggy code

## 5) Audit/event trail for recovery + AI memory
Critical actions write to `activity_events`:
- create/update/delete/restore
- publish actions (menu publish, layout publish)
- cost changes, inventory adjustments

This enables undo, forensics, and AI “what changed?” answers.

## 6) Supabase migrations only
- All DB changes go through migrations (Supabase CLI).
- Never edit production tables manually.
- Always apply to staging before prod.

## 7) Production safety
When Olivea uses Roseiies while development continues:
- separate staging vs production Supabase projects
- daily backups enabled
- PITR enabled when possible
- manual snapshot procedure before risky migrations
- storage backups separate from DB backups

## 8) Permissions & AI are the same gate
- UI and AI both use the same policy layer.
- AI never sees data the user cannot read in UI.

## 9) Avoid “app-owned databases”
Apps do not get their own silo tables that duplicate concepts.
Apps operate on:
- workplace graph entities
- domain record tables
- type-specific meta

## 10) Index discipline
Every record table must be efficiently queryable by:
- workplace_id
- created_at / updated_at
- identity_id (when present)
- area_id / asset_id (when present)

Always add indices for these access paths.