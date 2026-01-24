// apps/studio/app/api/plantings/route.ts

import { createServerSupabase } from "@roseiies/supabase/server";
import { resolveTenantFromReq, requireStudioToken } from "../../lib/server/tenant-auth";

async function resolveGardenId(args: { supabase: any; tenantId: string; gardenName: string }) {
  const { supabase, tenantId, gardenName } = args;

  const { data: garden, error } = await supabase
    .from("gardens")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", gardenName)
    .limit(1)
    .maybeSingle();

  if (error || !garden?.id) {
    return { gardenId: null as string | null, error: error?.message ?? "Garden not found" };
  }

  return { gardenId: garden.id as string, error: null as string | null };
}

async function ensureGardenId(args: { supabase: any; tenantId: string; gardenName: string }) {
  const { supabase, tenantId, gardenName } = args;

  const resolved = await resolveGardenId({ supabase, tenantId, gardenName });
  if (resolved.gardenId) return resolved;

  const { data: created, error: createErr } = await supabase
    .from("gardens")
    .insert({ tenant_id: tenantId, name: gardenName })
    .select("id")
    .single();

  if (createErr || !created?.id) {
    return { gardenId: null as string | null, error: createErr?.message ?? "Failed to create garden" };
  }

  return { gardenId: created.id as string, error: null as string | null };
}

export async function GET(req: Request) {
  const supabase = createServerSupabase();
  const { tenantId, host, mode } = await resolveTenantFromReq(req);

  if (!tenantId) {
    return Response.json({ error: "Unknown tenant (host not mapped)", host, mode }, { status: 404 });
  }

  const url = new URL(req.url);
  const gardenName = url.searchParams.get("gardenName");

  if (!gardenName) return Response.json({ error: "Missing gardenName" }, { status: 400 });

  const { gardenId } = await resolveGardenId({ supabase, tenantId, gardenName });

  if (!gardenId) return Response.json([]);

  const { data, error } = await supabase
    .from("garden_plantings")
    .select("id, bed_id, zone_code, crop, status, planted_at, pin_x, pin_y, created_at")
    .eq("tenant_id", tenantId)
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const { tenantId, host, mode } = await resolveTenantFromReq(req);

  if (!tenantId) {
    return Response.json({ error: "Unknown tenant (host not mapped)", host, mode }, { status: 404 });
  }

  const gate = requireStudioToken(req);
  if (!gate.ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const gardenName = (body?.gardenName as string | undefined)?.trim();
  if (!gardenName) return Response.json({ error: "Missing gardenName" }, { status: 400 });

  const { gardenId, error: gerr } = await ensureGardenId({ supabase, tenantId, gardenName });
  if (!gardenId) return Response.json({ error: gerr ?? "Garden not found" }, { status: 400 });

  const { bed_id, zone_code, crop, planted_at, pin_x, pin_y, status } = body ?? {};

  // ✅ REQUIRED: bed_id must be present
  const bedId = typeof bed_id === "string" ? bed_id.trim() : "";
  if (!bedId) {
    return Response.json(
      { error: "Select a Bed/Tree before creating a planting (bed_id is required)." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("garden_plantings")
    .insert({
      tenant_id: tenantId,
      garden_id: gardenId,
      bed_id: bedId, // ✅ never null
      zone_code: typeof zone_code === "string" && zone_code.trim() ? zone_code.trim() : null,
      crop: typeof crop === "string" && crop.trim() ? crop.trim() : null,
      status: typeof status === "string" && status.trim() ? status.trim() : null,
      planted_at: typeof planted_at === "string" && planted_at.trim() ? planted_at.trim() : null,
      pin_x: pin_x ?? null,
      pin_y: pin_y ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function PATCH(req: Request) {
  const supabase = createServerSupabase();
  const { tenantId, host, mode } = await resolveTenantFromReq(req);

  if (!tenantId) {
    return Response.json({ error: "Unknown tenant (host not mapped)", host, mode }, { status: 404 });
  }

  const gate = requireStudioToken(req);
  if (!gate.ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowed = ["crop", "status", "planted_at", "bed_id", "zone_code", "pin_x", "pin_y"] as const;

  const patch: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }

  // optional: normalize bed_id on patch
  if ("bed_id" in patch) {
    const v = typeof patch.bed_id === "string" ? patch.bed_id.trim() : "";
    if (!v) return Response.json({ error: "bed_id is required (cannot be empty)." }, { status: 400 });
    patch.bed_id = v;
  }

  const { data, error } = await supabase
    .from("garden_plantings")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}