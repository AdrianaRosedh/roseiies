import { createServerSupabase } from "@roseiies/supabase/server";
import { resolveTenantFromReq, requireStudioToken } from "@/app/lib/server/tenant-auth";

async function resolveGardenId(args: {
  supabase: any;
  tenantId: string;
  gardenName: string;
}) {
  const { supabase, tenantId, gardenName } = args;

  const { data: garden, error } = await supabase
    .from("gardens")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", gardenName)
    .limit(1)
    .maybeSingle();

  if (error || !garden?.id) {
    return {
      gardenId: null as string | null,
      error: error?.message ?? "Garden not found",
    };
  }

  return { gardenId: garden.id as string, error: null as string | null };
}

async function ensureGardenId(args: {
  supabase: any;
  tenantId: string;
  gardenName: string;
}) {
  const { supabase, tenantId, gardenName } = args;

  // Try resolve first
  const resolved = await resolveGardenId({ supabase, tenantId, gardenName });
  if (resolved.gardenId) return resolved;

  // If not found, create (Sheets-first workflow)
  const { data: created, error: createErr } = await supabase
    .from("gardens")
    .insert({
      tenant_id: tenantId,
      name: gardenName,
    })
    .select("id")
    .single();

  if (createErr || !created?.id) {
    return {
      gardenId: null as string | null,
      error: createErr?.message ?? "Failed to create garden",
    };
  }

  return { gardenId: created.id as string, error: null as string | null };
}

export async function GET(req: Request) {
  const supabase = createServerSupabase();
  const { tenantId, host, mode } = await resolveTenantFromReq(req);

  if (!tenantId) {
    return Response.json(
      { error: "Unknown tenant (host not mapped)", host, mode },
      { status: 404 }
    );
  }

  const url = new URL(req.url);
  const gardenName = url.searchParams.get("gardenName");

  if (!gardenName) {
    return Response.json({ error: "Missing gardenName" }, { status: 400 });
  }

  const { gardenId } = await resolveGardenId({
    supabase,
    tenantId,
    gardenName,
  });

  // ✅ DO NOT 404 for "not created yet" — return empty
  if (!gardenId) {
    return Response.json([]);
  }

  const { data, error } = await supabase
    .from("garden_plantings")
    .select("id, bed_id, crop, status, planted_at, pin_x, pin_y, created_at")
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
    return Response.json(
      { error: "Unknown tenant (host not mapped)", host, mode },
      { status: 404 }
    );
  }

  const gate = requireStudioToken(req);
  if (!gate.ok) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const gardenName = (body?.gardenName as string | undefined)?.trim();

  if (!gardenName) {
    return Response.json({ error: "Missing gardenName" }, { status: 400 });
  }

  // ✅ Auto-create garden if missing
  const { gardenId, error: gerr } = await ensureGardenId({
    supabase,
    tenantId,
    gardenName,
  });

  if (!gardenId) {
    return Response.json({ error: gerr ?? "Garden not found" }, { status: 400 });
  }

  const { bed_id, crop, planted_at, pin_x, pin_y, status } = body ?? {};

  const { data, error } = await supabase
    .from("garden_plantings")
    .insert({
      tenant_id: tenantId,
      garden_id: gardenId,
      bed_id: bed_id ?? null,
      crop: crop ?? null,
      status: status ?? null,
      planted_at: planted_at ?? null,
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
    return Response.json(
      { error: "Unknown tenant (host not mapped)", host, mode },
      { status: 404 }
    );
  }

  const gate = requireStudioToken(req);
  if (!gate.ok) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();

  const allowed = ["crop", "status", "planted_at", "bed_id", "pin_x", "pin_y"] as const;
  const patch: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }

  const { data, error } = await supabase
    .from("garden_plantings")
    .update(patch)
    .eq("tenant_id", tenantId) // IMPORTANT safety
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
