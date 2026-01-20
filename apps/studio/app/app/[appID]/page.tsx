import StudioChrome from "../../studio/StudioChrome";
import { getPortalContext } from "../../lib/portal/getPortalContext";
import GardenApp from "../../studio/apps/garden/GardenApp";

function normalize(s: unknown) {
  return decodeURIComponent(String(s ?? "")).trim().toLowerCase();
}

export default async function StudioAppPage({
  params,
}: {
  // ✅ Next 16 / Turbopack can give params as a Promise
  params: Promise<{ appID: string }>;
}) {
  const portal = await getPortalContext();

  // ✅ unwrap params
  const { appID } = await params;
  const appId = normalize(appID);

  return (
    <StudioChrome
      portal={portal}
      sectionLabel={appId === "garden" ? "Garden App" : "Studio"}
    >
      {appId === "garden" ? (
        <GardenApp portal={portal} />
      ) : (
        <div className="rounded-2xl border border-black/10 bg-white/55 p-6 backdrop-blur">
          <div className="text-lg font-semibold">Coming soon</div>
          <div className="mt-1 text-sm text-black/60">
            App “{appId}” isn’t live yet.
          </div>
        </div>
      )}
    </StudioChrome>
  );
}
