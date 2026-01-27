// apps/studio/app/api/garden-context/route.ts
import { createServerSupabase } from "@roseiies/supabase/server";

type Context = {
  workplaceId: string;
  areaId: string;
  layoutId: string;
  workplaceSlug: string;
  areaName: string;
};

export async function GET(req: Request) {
  const supabase = createServerSupabase();

  const url = new URL(req.url);
  const workplaceSlug = (url.searchParams.get("workplaceSlug") ?? "olivea").trim();
  const areaName = (url.searchParams.get("areaName") ?? "Garden").trim();
  const layoutId = (url.searchParams.get("layoutId") ?? "").trim();

  if (!workplaceSlug) return Response.json({ error: "Missing workplaceSlug" }, { status: 400 });
  if (!areaName && !layoutId) return Response.json({ error: "Missing areaName" }, { status: 400 });

  // ✅ Strongest anchor: resolve via layoutId first (prevents Principal/Garden mismatch)
  if (layoutId) {
    const { data: layout, error: lerr } = await supabase
      .schema("roseiies")
      .from("layouts")
      .select("id, workplace_id, area_id")
      .eq("id", layoutId)
      .maybeSingle();

    if (lerr || !layout?.id) {
      return Response.json({ error: lerr?.message ?? "Layout not found" }, { status: 404 });
    }

    const { data: workplace, error: werr } = await supabase
      .schema("roseiies")
      .from("workplaces")
      .select("id, slug")
      .eq("id", layout.workplace_id)
      .maybeSingle();

    const { data: area, error: aerr } = await supabase
      .schema("roseiies")
      .from("areas")
      .select("id, name")
      .eq("id", layout.area_id)
      .maybeSingle();

    if (werr || !workplace?.id) {
      return Response.json({ error: werr?.message ?? "Workplace not found" }, { status: 404 });
    }
    if (aerr || !area?.id) {
      return Response.json({ error: aerr?.message ?? "Area not found" }, { status: 404 });
    }

    const ctx: Context = {
      workplaceId: workplace.id,
      areaId: area.id,
      layoutId: layout.id,
      workplaceSlug: workplace.slug,
      areaName: area.name,
    };

    return Response.json(ctx);
  }

  // Fallback: resolve active layout for (workplaceSlug, areaName)
  const { data: workplace, error: werr } = await supabase
    .schema("roseiies")
    .from("workplaces")
    .select("id, slug")
    .eq("slug", workplaceSlug)
    .maybeSingle();

  if (werr || !workplace?.id) {
    return Response.json({ error: werr?.message ?? "Workplace not found" }, { status: 404 });
  }

  const { data: area, error: aerr } = await supabase
    .schema("roseiies")
    .from("areas")
    .select("id, name")
    .eq("workplace_id", workplace.id)
    .eq("name", areaName)
    .maybeSingle();

  if (aerr || !area?.id) {
    return Response.json({ error: aerr?.message ?? "Area not found" }, { status: 404 });
  }

  const { data: layout, error: lerr } = await supabase
    .schema("roseiies")
    .from("layouts")
    .select("id")
    .eq("workplace_id", workplace.id)
    .eq("area_id", area.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lerr || !layout?.id) {
    return Response.json({ error: lerr?.message ?? "Active layout not found" }, { status: 404 });
  }

  const ctx: Context = {
    workplaceId: workplace.id,
    areaId: area.id,
    layoutId: layout.id,
    workplaceSlug: workplace.slug,
    areaName: area.name,
  };

  return Response.json(ctx);
}
