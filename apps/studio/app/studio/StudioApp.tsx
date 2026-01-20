"use client";

import { useState } from "react";
import WorkplaceHome, { type AppTile } from "./WorkplaceHome";
import GardenApp, { type GardenView } from "./apps/garden/GardenApp";
import StudioChrome from "./StudioChrome";
import type { PortalContext } from "../lib/portal/getPortalContext";

export default function StudioApp({ portal }: { portal: PortalContext }) {
  const [openApp, setOpenApp] = useState<string | null>(null);

  // ✅ required by GardenApp types
  const [gardenView, setGardenView] = useState<GardenView>("designer");

  const apps: AppTile[] = [
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
  ];

  if (openApp === "garden") {
    return (
      <StudioChrome portal={portal} sectionLabel="Garden App">
        <GardenApp
          onBack={() => setOpenApp(null)}
          portal={portal}
          view={gardenView}
          onViewChange={setGardenView}
        />
      </StudioChrome>
    );
  }

  return (
    <StudioChrome portal={portal} sectionLabel="Workplace">
      <WorkplaceHome
        apps={apps}
        onOpen={(id: string) => {
          console.log("[StudioApp] open:", id);
          if (id === "garden") setGardenView("designer");
          setOpenApp(id);
        }}
      />
    </StudioChrome>
  );
}
