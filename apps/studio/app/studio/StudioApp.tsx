"use client";

import { useState } from "react";
import WorkplaceHome from "./WorkplaceHome";
import GardenApp from "./apps/garden/GardenApp";
import StudioChrome from "./StudioChrome";
import type { PortalContext } from "../lib/portal/getPortalContext";

export default function StudioApp({ portal }: { portal: PortalContext }) {
  const [openApp, setOpenApp] = useState<string | null>(null);

  if (openApp === "garden") {
    return (
      <StudioChrome portal={portal} sectionLabel="Garden App">
        <GardenApp onBack={() => setOpenApp(null)} portal={portal} />
      </StudioChrome>
    );
  }

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
        onOpen={setOpenApp}
      />
    </StudioChrome>
  );
}
