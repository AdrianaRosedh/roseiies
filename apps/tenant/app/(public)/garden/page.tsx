import { redirect } from "next/navigation";
import { loadPublishedGardenLayout } from "@/lib/garden/load-published-layout";

export default async function GardenPublicPage() {
  const tenantId = "olivea";
  const data = await loadPublishedGardenLayout(tenantId);

  if (!data?.layout?.id) {
    return (
      <main className="relative h-dvh w-screen overflow-hidden bg-(--rose-bg)">
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm p-6 text-sm text-(--rose-muted)">
            No published view found yet.
          </div>
        </div>
      </main>
    );
  }

  redirect(`/view/${data.layout.id}`);
}
