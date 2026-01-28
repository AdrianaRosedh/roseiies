// apps/tenant/app/api/garden-viewer-context/route.ts
import { createServerSupabase } from "@roseiies/supabase/server";

type ViewerContext = {
  enabled: boolean;
  workplaceId: string;
  workplaceSlug: string;
  areaId: string;
  areaName: string;
  layoutId: string;
  revision: string; // used for polling
};

function iso(x: string | null | undefined) {
  return x ?? "";
}

export async function GET(req: Request) {
  const supabase = createServerSupabase();

  const url = new URL(req.url);
  const workplaceSlug = (url.searchParams.get("workplaceSlug") ?? "olivea").trim();
  const areaName = (url.searchParams.get("areaName") ?? "Garden").trim();

  if (!workplaceSlug) {
    return Response.json({ error: "Missing workplaceSlug" }, { status: 400 });
  }
  if (!areaName) {
    return Response.json({ error: "Missing areaName" }, { status: 400 });
  }

  // 1) Resolve workplace
  const { data: workplace, error: werr } = await supabase
    .schema("roseiies")
    .from("workplaces")
    .select("id, slug")
    .eq("slug", workplaceSlug)
    .maybeSingle();

  if (werr || !workplace?.id) {
    return Response.json({ error: werr?.message ?? "Workplace not found" }, { status: 404 });
  }

  // 2) Resolve area + viewer flags
  const { data: area, error: aerr } = await supabase
    .schema("roseiies")
    .from("areas")
    .select("id, name, viewer_enabled, viewer_follow_active, viewer_layout_id")
    .eq("workplace_id", workplace.id)
    .eq("name", areaName)
    .maybeSingle();

  if (aerr || !area?.id) {
    return Response.json({ error: aerr?.message ?? "Area not found" }, { status: 404 });
  }

  if (!area.viewer_enabled) {
    // gate: tenant view does not exist until first publish
    return Response.json(
      { error: "Viewer not enabled (publish required first)" },
      { status: 404 }
    );
  }

  // 3) Resolve layout via pointer rules
  let layoutId: string | null = null;

  if (!area.viewer_follow_active && area.viewer_layout_id) {
    layoutId = area.viewer_layout_id;
  } else {
    // follow active
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

    layoutId = layout.id;
  }

  if (!layoutId) {
    return Response.json({ error: "No viewer layout resolved" }, { status: 404 });
  }

  // 4) Build a cheap "revision" token for polling.
  //    We treat revision as: max(updated_at) across layout + assets(layout) + plantings(area, guest_visible)
  const { data: layoutRow } = await supabase
    .schema("roseiies")
    .from("layouts")
    .select("updated_at")
    .eq("id", layoutId)
    .maybeSingle();

  const { data: assetsMax } = await supabase
    .schema("roseiies")
    .from("assets")
    .select("updated_at")
    .eq("layout_id", layoutId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: plantingsMax } = await supabase
    .schema("roseiies")
    .from("plantings")
    .select("updated_at")
    .eq("area_id", area.id)
    .eq("guest_visible", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Revision can be any stable string; concatenating timestamps works great.
  const revision = [
    iso(layoutRow?.updated_at),
    iso(assetsMax?.updated_at),
    iso(plantingsMax?.updated_at),
  ].join("|");

  const ctx: ViewerContext = {
    enabled: true,
    workplaceId: workplace.id,
    workplaceSlug: workplace.slug,
    areaId: area.id,
    areaName: area.name,
    layoutId,
    revision,
  };

  return Response.json(ctx);
}
