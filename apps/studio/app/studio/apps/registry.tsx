// apps/studio/app/studio/apps/registry.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { PortalContext } from "../../lib/portal/getPortalContext";
import type { AppTile } from "../WorkplaceHome";

import GardenApp, { type GardenView } from "./garden/GardenApp";

export type AppDefinition = {
  tile: AppTile;
  render: (args: { portal: PortalContext; onBack: () => void }) => React.ReactNode;
};

function gardenViewKey(tenantId: string) {
  return `roseiies:garden:view:v1:${tenantId}`;
}

function readGardenView(tenantId: string): GardenView {
  try {
    const raw = localStorage.getItem(gardenViewKey(tenantId));
    return raw === "dashboard" || raw === "sheets" || raw === "designer" ? raw : "dashboard";
  } catch {
    return "designer";
  }
}

function writeGardenView(tenantId: string, view: GardenView) {
  try {
    localStorage.setItem(gardenViewKey(tenantId), view);
  } catch {}
}

function GardenAppHost({
  portal,
  onBack,
}: {
  portal: PortalContext;
  onBack: () => void;
}) {
  const tenantId = portal?.tenantId ?? "";

  // deterministic initial state
  const [view, setView] = useState<GardenView>("dashboard");

  // ✅ gate rendering until we restore preference
  const [ready, setReady] = useState(false);

  // ✅ dashboard overlay: open on entry
  const [dashboardOpen, setDashboardOpen] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setReady(true);
      return;
    }
    const v = readGardenView(tenantId);
    setView(v);
    setReady(true);
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    if (!ready) return; // avoid writing during the restore pass
    writeGardenView(tenantId, view);
  }, [tenantId, view, ready]);

  // ✅ Each time the Garden app host mounts (entering the app), show dashboard.
  useEffect(() => {
    setDashboardOpen(true);
  }, []);

  // ✅ prevents “designer flash”
  if (!ready) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center text-black/40">
        Cargando…
      </div>
    );
  }

  return (
    <GardenApp
      portal={portal}
      onBack={onBack}
      view={view}
      onViewChange={(v) => {
        setView(v);
        if (tenantId) writeGardenView(tenantId, v);
      }}
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
