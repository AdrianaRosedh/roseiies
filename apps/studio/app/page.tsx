// apps/studio/app/page.tsx
import StudioChrome from "./studio/StudioChrome";
import WorkplaceHome from "./studio/WorkplaceHome";
import { getPortalContext } from "./lib/portal/getPortalContext";

export default async function Page() {
  const portal = await getPortalContext();

  return (
    <StudioChrome portal={portal} sectionLabel="Workplace">
      <WorkplaceHome
        apps={[
          {
            id: "garden",
            name: "Garden App",
            description: "Map + Sheets — one truth layer → role projections.",
            status: "beta",
          },
          {
            id: "menus",
            name: "Menu Intelligence",
            description: "Crop → dish links, cost, R&D cycles (coming soon).",
            status: "soon",
          },
          {
            id: "ops",
            name: "Ops Tasks",
            description: "Work orders, checklists, schedules (coming soon).",
            status: "soon",
          },
        ]}
      />
    </StudioChrome>
  );
}
