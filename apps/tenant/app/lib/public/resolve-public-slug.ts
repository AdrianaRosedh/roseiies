import { createServerSupabase } from "@roseiies/supabase/server";

function asText(v: any) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export async function resolvePublicSlug(args: { slug: string }): Promise<{
  enabled: boolean;
  type: string;
  layoutId: string | null;
  url: string | null;
} | null> {
  const supabase = createServerSupabase();
  const slug = asText(args?.slug);
  if (!slug) return null;

  const { data: pr, error: prErr } = await supabase
    .schema("roseiies")
    .from("public_resources")
    .select("enabled, type, target, workplace_id, updated_at")
    .eq("slug", slug)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prErr || !pr) return null;
  if (!pr.enabled) return { enabled: false, type: String(pr.type ?? ""), layoutId: null, url: null };

  const type = String(pr.type ?? "");
  const target = (pr as any).target ?? {};

  if (type === "external") {
    return { enabled: true, type, layoutId: null, url: asText(target?.url) };
  }

  if (type === "layout_view") {
    return { enabled: true, type, layoutId: asText(target?.layoutId), url: null };
  }

  if (type === "area_view") {
    const areaId = asText(target?.areaId);
    if (!areaId) return { enabled: true, type, layoutId: null, url: null };

    const { data: area, error: aErr } = await supabase
      .schema("roseiies")
      .from("areas")
      .select("id, viewer_enabled, viewer_follow_active, viewer_layout_id, workplace_id")
      .eq("id", areaId)
      .maybeSingle();

    if (aErr || !area?.id) return { enabled: true, type, layoutId: null, url: null };
    if (!area.viewer_enabled) return { enabled: true, type, layoutId: null, url: null };

    if (!area.viewer_follow_active && area.viewer_layout_id) {
      return { enabled: true, type, layoutId: String(area.viewer_layout_id), url: null };
    }

    const { data: layout, error: lErr } = await supabase
      .schema("roseiies")
      .from("layouts")
      .select("id")
      .eq("workplace_id", area.workplace_id)
      .eq("area_id", area.id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lErr || !layout?.id) return { enabled: true, type, layoutId: null, url: null };

    return { enabled: true, type, layoutId: layout.id, url: null };
  }

  return { enabled: true, type, layoutId: null, url: null };
}
