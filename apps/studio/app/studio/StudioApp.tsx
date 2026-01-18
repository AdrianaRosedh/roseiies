"use client";

import { useState } from "react";
import WorkplaceHome from "./WorkplaceHome";
import GardenApp from "./apps/garden/GardenApp";

export default function StudioApp() {
  const [openApp, setOpenApp] = useState<string | null>(null);

  if (openApp === "garden") {
    return <GardenApp onBack={() => setOpenApp(null)} />;
  }

  return (
    <WorkplaceHome
      apps={[
        {
          id: "garden",
          name: "Garden App",
          description:
            "Map + sheets. One truth layer → guest, gardener, kitchen projections.",
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
  );
}
