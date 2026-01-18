import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type GardenPlanting = {
  id: string;
  tenant_id: string;
  garden_id: string;
  bed_id: string;
  crop: string;
  status: string | null;
  planted_at: string | null;

  pin_x: number | null;
  pin_y: number | null;

  guest_story: string | null;
  guest_facts: any | null;
  gardener_notes: string | null;
  kitchen_notes: string | null;
};

export async function loadGardenPlantings(args: {
  tenantId: string;
  gardenId: string;
}) {
  const { tenantId, gardenId } = args;

  const { data, error } = await supabase
    .from("garden_plantings")
    .select(
      "id, tenant_id, garden_id, bed_id, crop, status, planted_at, pin_x, pin_y, guest_story, guest_facts, gardener_notes, kitchen_notes"
    )
    .eq("tenant_id", tenantId)
    .eq("garden_id", gardenId);

  if (error) return [];
  return (data ?? []) as GardenPlanting[];
}
