import { supabasePublic } from "@roseiies/supabase/client";

export async function getBedsWithCards(tenantId: string) {
  const supabase = supabasePublic();

  const { data: beds, error: bedErr } = await supabase
    .from("garden_beds")
    .select("id, slug, label, shape, status, updated_at")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (bedErr) throw bedErr;

  const bedIds = (beds ?? []).map((b) => b.id);
  if (bedIds.length === 0) return { beds: [], cardsByBedId: {} as Record<string, any> };

  const { data: cards, error: cardErr } = await supabase
    .from("bed_cards")
    .select("bed_id, title, story, images, updated_at")
    .in("bed_id", bedIds);

  if (cardErr) throw cardErr;

  const cardsByBedId: Record<string, any> = {};
  for (const c of cards ?? []) cardsByBedId[c.bed_id] = c;

  return { beds: beds ?? [], cardsByBedId };
}
