import { createServerSupabase } from "@roseiies/supabase/server";

export async function GET(req: Request) {
  const supabase = createServerSupabase();
  const url = new URL(req.url);

  const tenantId = url.searchParams.get("tenantId");
  const gardenName = url.searchParams.get("gardenName");

  if (!tenantId || !gardenName) {
    return Response.json({ error: "Missing tenantId or gardenName" }, { status: 400 });
  }

  const { data: garden, error: gardenErr } = await supabase
    .from("gardens")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", gardenName)
    .limit(1)
    .maybeSingle();

  if (gardenErr || !garden) {
    return Response.json({ error: gardenErr?.message ?? "Garden not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("garden_plantings")
    .select("id, bed_id, crop, status, planted_at, pin_x, pin_y, created_at")
    .eq("tenant_id", tenantId)
    .eq("garden_id", garden.id)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const body = await req.json();

  const { tenant_id, garden_id, bed_id, crop, planted_at, pin_x, pin_y } = body;

  const { data, error } = await supabase
    .from("garden_plantings")
    .insert({
      tenant_id,
      garden_id,
      bed_id,
      crop,
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
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
