"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StudioChrome from "./StudioChrome";
import WorkplaceHome from "./WorkplaceHome";
import type { PortalContext } from "../lib/portal/getPortalContext";
import { APP_REGISTRY, APP_TILES, isKnownApp } from "./apps/registry";

function normalize(s: unknown) {
  return decodeURIComponent(String(s ?? "")).trim().toLowerCase();
}

export default function StudioApp({
  portal,
  initialAppId = null,
}: {
  portal: PortalContext;
  initialAppId?: string | null;
}) {
  const router = useRouter();

  const [openApp, setOpenApp] = useState<string | null>(
    initialAppId ? normalize(initialAppId) : null
  );

  useEffect(() => {
    setOpenApp(initialAppId ? normalize(initialAppId) : null);
  }, [initialAppId]);

  const appDef = useMemo(() => {
    if (!openApp) return null;
    return APP_REGISTRY[openApp] ?? null;
  }, [openApp]);

  // If we land on /app/something-unknown, don’t break — just show Workplace
  const showWorkplace = !openApp || !isKnownApp(openApp) || appDef?.tile.status === "soon";

    if (!showWorkplace && appDef) {
    return (
      <StudioChrome
        portal={portal}
        sectionLabel={appDef.tile.name}
        hideHeader
        fullBleed
      >
        {appDef.render({
          portal,
          onBack: () => {
            setOpenApp(null);
            router.push("/");
          },
        })}
      </StudioChrome>
    );
  }

  return (
    <StudioChrome portal={portal} sectionLabel="Workplace">
      <WorkplaceHome
        apps={APP_TILES}
        onOpen={(id) => {
          const normalized = normalize(id);

          // Only navigate; do not “open” via local state (URL is the source of truth)
          router.push(`/app/${normalized}`);
        }}
      />
    </StudioChrome>
  );
}
