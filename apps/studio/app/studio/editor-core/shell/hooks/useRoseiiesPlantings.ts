"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabase } from "@roseiies/supabase/browser";
import type { LayoutDoc } from "../../types";
import type { PortalContext } from "../../../../lib/portal/getPortalContext";

export type PlantingRow = {
  id: string;
  bed_id: string | null;
  zone_code: string | null;
  crop: string | null;
  status: string | null;
  planted_at: string | null;
  pin_x: number | null;
  pin_y: number | null;

  garden_id?: string | null;
  created_at?: string | null;
};

function sanitizePlantingsForDoc(doc: LayoutDoc, plantings: PlantingRow[]) {
  const items = doc?.items ?? [];
  const beds = items.filter((it: any) => it.type === "bed");
  const validItemIds = new Set(items.map((it: any) => it.id));

  const zonesForBed = (bedId: string) => {
    const bed = beds.find((b: any) => b.id === bedId);
    const zones = bed?.meta?.zones;
    if (!Array.isArray(zones)) return [];
    return zones.map((z: any) => String(z?.code ?? "").trim()).filter(Boolean);
  };

  return (plantings ?? [])
    .filter((p) => p && p.bed_id && validItemIds.has(p.bed_id))
    .map((p) => {
      const bedId = p.bed_id as string;
      const allowed = zonesForBed(bedId);
      const z = p.zone_code ? String(p.zone_code).trim() : null;

      const zone_code =
        allowed.length === 0 ? z : z && allowed.includes(z) ? z : null;

      return { ...p, zone_code };
    });
}

export function useRoseiiesPlantings(args: {
  doc: LayoutDoc;
  portal: PortalContext;
  activeLayoutId: string | null;

  areaName?: string; // default "Garden"
  workplaceSlug?: string; // default "olivea"
}) {
  const { doc, portal, activeLayoutId } = args;
  const areaName = args.areaName ?? "Garden";
  const workplaceSlug = args.workplaceSlug ?? "olivea";

  const [plantingsRaw, setPlantingsRaw] = useState<PlantingRow[]>([]);
  const inFlightRef = useRef<AbortController | null>(null);

  // cache ctx in-memory
  const ctxRef = useRef<{ key: string; ctx: any } | null>(null);

  async function getGardenCtx() {
    const cached = ctxRef.current;
    if (cached && cached.key === areaName) return cached.ctx;

    const res = await fetch(
      `/api/garden-context?workplaceSlug=${encodeURIComponent(
        workplaceSlug
      )}&areaName=${encodeURIComponent(areaName)}`
    );
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;

    if (!res.ok) {
      throw new Error(
        json?.error ?? text ?? `garden-context failed (${res.status})`
      );
    }

    ctxRef.current = { key: areaName, ctx: json };
    return json;
  }

  async function refresh() {
    try {
      const ctx = await getGardenCtx();

      // cancel old request
      if (inFlightRef.current) inFlightRef.current.abort();
      const ac = new AbortController();
      inFlightRef.current = ac;

      const res = await fetch(
        `/api/plantings?layoutId=${encodeURIComponent(ctx.layoutId)}`,
        { signal: ac.signal }
      );
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) return;

      const rows = (Array.isArray(json?.rows) ? json.rows : []) as PlantingRow[];
      setPlantingsRaw(rows);
    } catch {
      // ignore in designer
    }
  }

  // initial fetch / layout switch
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayoutId, portal?.tenantId]);

  // realtime subscription: roseiies.plantings
  useEffect(() => {
    if (!portal?.tenantId) return;

    const supabase = createBrowserSupabase();
    let channel: any = null;
    let alive = true;

    let t: any = null;
    const scheduleRefresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => refresh(), 140);
    };

    (async () => {
      try {
        const ctx = await getGardenCtx();
        if (!alive) return;

        channel = supabase
          .channel(`roseiies:plantings:${portal.tenantId}:${ctx.workplaceId}:${areaName}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "roseiies",
              table: "plantings",
              filter: `workplace_id=eq.${ctx.workplaceId}`,
            },
            () => scheduleRefresh()
          )
          .subscribe();
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
      if (t) clearTimeout(t);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal?.tenantId]);

  const plantings = useMemo(
    () => sanitizePlantingsForDoc(doc, plantingsRaw),
    [doc, plantingsRaw]
  );

  return { plantings, refresh };
}
