import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function loadPublishedGardenLayout(tenantId: string) {
  const { data: layout, error: layoutErr } = await supabase
    .from("garden_layouts")
    .select("id, garden_id, name, canvas")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .single();

  if (layoutErr || !layout) return null;

  const { data: items, error: itemsErr } = await supabase
    .from("garden_layout_items")
    .select("id, type, x, y, w, h, r, order, label, meta, style")
    .eq("layout_id", layout.id)
    .order("order", { ascending: true });

  if (itemsErr) return null;

  return { layout, items: items ?? [] };
}