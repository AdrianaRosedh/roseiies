"use client";

import React, { useState } from "react";
import type { PortalContext } from "../../lib/portal/getPortalContext";
import type { AppTile } from "../WorkplaceHome";

import GardenApp, { type GardenView } from "./garden/GardenApp";

export type AppDefinition = {
  tile: AppTile;
  render: (args: { portal: PortalContext; onBack: () => void }) => React.ReactNode;
};

function GardenAppHost({
  portal,
  onBack,
}: {
  portal: PortalContext;
  onBack: () => void;
}) {
  const [view, setView] = useState<GardenView>("designer");

  return (
    <GardenApp
      portal={portal}
      onBack={onBack}
      view={view}
      onViewChange={setView} // ✅ fixes missing prop
    />
  );
}

export const APP_REGISTRY: Record<string, AppDefinition> = {
  garden: {
    tile: {
      id: "garden",
      name: "Garden App",
      description: "Map + Sheets — one truth layer → role projections.",
      status: "beta",
    },
    render: ({ portal, onBack }) => <GardenAppHost portal={portal} onBack={onBack} />,
  },

  menus: {
    tile: {
      id: "menus",
      name: "Menu Intelligence",
      description: "Crop → dish links, cost, R&D cycles (coming soon).",
      status: "soon",
    },
    render: () => null,
  },

  ops: {
    tile: {
      id: "ops",
      name: "Ops Tasks",
      description: "Work orders, checklists, schedules (coming soon).",
      status: "soon",
    },
    render: () => null,
  },
};

export const APP_TILES: AppTile[] = Object.values(APP_REGISTRY).map((a) => a.tile);

export function isKnownApp(appId: string | null | undefined) {
  if (!appId) return false;
  return Boolean(APP_REGISTRY[appId]);
}

