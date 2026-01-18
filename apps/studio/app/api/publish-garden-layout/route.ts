import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type LayoutDoc = {
  version: 1;
  canvas: { width: number; height: number };
  items: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    r: number;
    order: number;
    label: string;
    meta: any;
    style: any;
  }>;
};

export async function POST(req: Request) {
  const body = (await req.json()) as {
    tenantId: string;
    gardenName: string;
    layoutName: string;
    doc: LayoutDoc;
  };

  if (!body?.tenantId || !body?.gardenName || !body?.layoutName || !body?.doc) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tenantId = body.tenantId;
  const gardenName = body.gardenName.trim();
  const layoutName = body.layoutName.trim();

  // 1) Find or create garden
  // ✅ Fix: limit(1) prevents "multiple rows" -> maybeSingle crash
  const { data: existingGarden, error: gardenSelectErr } = await supabase
    .from("gardens")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", gardenName)
    .limit(1)
    .maybeSingle();

  if (gardenSelectErr) {
    return NextResponse.json({ error: gardenSelectErr.message }, { status: 500 });
  }

  let gardenId = existingGarden?.id as string | undefined;

  if (!gardenId) {
    const { data: createdGarden, error: gardenInsertErr } = await supabase
      .from("gardens")
      .insert({ tenant_id: tenantId, name: gardenName })
      .select("id")
      .single();

    if (gardenInsertErr || !createdGarden?.id) {
      return NextResponse.json(
        { error: gardenInsertErr?.message ?? "Failed to create garden" },
        { status: 500 }
      );
    }

    gardenId = createdGarden.id;
  }

  // 2) Unpublish other layouts for this garden
  const { error: unpubErr } = await supabase
    .from("garden_layouts")
    .update({ status: "draft" })
    .eq("tenant_id", tenantId)
    .eq("garden_id", gardenId);

  if (unpubErr) {
    return NextResponse.json({ error: unpubErr.message }, { status: 500 });
  }

  // 3) Find existing layout by (tenant_id, garden_id, name)
  // ✅ Fix: limit(1) prevents "multiple rows" -> maybeSingle crash
  const { data: existingLayout, error: layoutSelectErr } = await supabase
    .from("garden_layouts")
    .select("id, version")
    .eq("tenant_id", tenantId)
    .eq("garden_id", gardenId)
    .eq("name", layoutName)
    .limit(1)
    .maybeSingle();

  if (layoutSelectErr) {
    return NextResponse.json({ error: layoutSelectErr.message }, { status: 500 });
  }

  let layoutId: string;

  if (!existingLayout?.id) {
    const { data: createdLayout, error: layoutInsertErr } = await supabase
      .from("garden_layouts")
      .insert({
        tenant_id: tenantId,
        garden_id: gardenId,
        name: layoutName,
        status: "published",
        canvas: body.doc.canvas,
      })
      .select("id, version")
      .single();

    if (layoutInsertErr || !createdLayout?.id) {
      return NextResponse.json(
        { error: layoutInsertErr?.message ?? "Failed to create layout" },
        { status: 500 }
      );
    }

    layoutId = createdLayout.id;
  } else {
    layoutId = existingLayout.id;
    const nextVersion = Number(existingLayout.version ?? 1) + 1;

    const { error: layoutUpdateErr } = await supabase
      .from("garden_layouts")
      .update({
        status: "published",
        canvas: body.doc.canvas,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", layoutId);

    if (layoutUpdateErr) {
      return NextResponse.json({ error: layoutUpdateErr.message }, { status: 500 });
    }
  }

  // 4) Replace layout items
  const { error: delErr } = await supabase
    .from("garden_layout_items")
    .delete()
    .eq("layout_id", layoutId);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  const rows =
    body.doc.items?.map((it) => ({
      tenant_id: tenantId,
      layout_id: layoutId,
      type: it.type,
      x: it.x,
      y: it.y,
      w: it.w,
      h: it.h,
      r: it.r,
      order: it.order ?? 0,
      label: it.label ?? "",
      meta: it.meta ?? {},
      style: it.style ?? {},
      updated_at: new Date().toISOString(),
    })) ?? [];

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("garden_layout_items").insert(rows);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    tenantId,
    gardenId,
    layoutId,
    layoutName,
    itemsWritten: rows.length,
  });
}
