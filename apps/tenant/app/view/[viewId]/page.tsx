import { notFound } from "next/navigation";
import { loadViewById } from "@/lib/views/load-view";
import Viewer from "@/components/viewer/Viewer";
import { loadFeaturesForView } from "@/lib/features/load-features";

export default async function ViewPage({
  params,
}: {
  params: Promise<{ viewId: string }>;
}) {
  const { viewId } = await params;
  const id = String(viewId ?? "").trim();
  if (!id) return notFound();

  const view = await loadViewById({ viewId: id });
  if (!view) return notFound();

  // DB asset ids come from load-view.ts injection: item.meta.db_id
  const assetIds = (view.items ?? [])
    .map((it: any) => String(it?.meta?.db_id ?? ""))
    .filter(Boolean);

  const bundle = await loadFeaturesForView({
    workplaceId: view.layout.workplace_id,
    areaId: view.layout.area_id,          // ✅ important
    areaKind: view.layout.area_kind,
    assetIds,
    mode: "guest",                        // or "team" later
  });

  return (
    <main style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <Viewer
        title={view.layout.workplace_name ?? "Roseiies"}
        subtitle={view.layout.area_name ?? view.layout.name ?? "Map"}
        canvas={view.layout.canvas}
        items={view.items as any}
        features={bundle.features}
        role="guest"
      />
    </main>
  );
}
