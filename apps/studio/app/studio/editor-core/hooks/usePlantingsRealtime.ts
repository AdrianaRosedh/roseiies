// apps/studio/app/studio/editor-core/hooks/usePlantingsRealtime.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayoutDoc } from "../types";
import { createBrowserSupabase } from "@roseiies/supabase/browser";

export type PlantingRow = {
  id: string;
  bed_id: string | null;      // canvas item id (bed/tree id)
  zone_code: string | null;   // "A" | "B" | ...
  crop: string | null;
  status: string | null;
  planted_at: string | null;
  pin_x: number | null;
  pin_y: number | null;
  created_at?: string | null;
};

type GardenContext = {
  workplaceId: string;
  areaId: string;
  layoutId: string;
  workplaceSlug: string;
  areaName: string;
};

function safeAreaName(raw: string | null) {
  const s = String(raw ?? "").trim();
  return s.length ? s : "Garden";
}

async function fetchGardenContext(areaName: string) {
  const res = await fetch(
    `/api/garden-context?workplaceSlug=olivea&areaName=${encodeURIComponent(areaName)}`
  );
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error ?? text ?? `garden-context failed (${res.status})`);
  return json as GardenContext;
}

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

      // ✅ If the bed defines zones, validate. If not, keep whatever came from DB.
      const zone_code =
        allowed.length === 0 ? z : (z && allowed.includes(z) ? z : null);

      return { ...p, zone_code };
    });
}

export function usePlantingsRealtime(args: {
  tenantId: string | null;
  gardenName: string | null; // this is AREA name now (we default to "Garden")
  doc: LayoutDoc;
}) {
  const { tenantId, gardenName: rawGardenName, doc } = args;

  const gardenName = safeAreaName(rawGardenName);

  const ctxRef = useRef<{ key: string; ctx: GardenContext } | null>(null);

  const [version, setVersion] = useState(0);
  const mapRef = useRef<Map<string, PlantingRow>>(new Map());

  async function getCtx() {
    const cached = ctxRef.current;
    if (cached && cached.key === gardenName) return cached.ctx;
    const ctx = await fetchGardenContext(gardenName);
    ctxRef.current = { key: gardenName, ctx };
    return ctx;
  }

  // ---------------------------------------------------------
  // Initial load (and whenever gardenName changes)
  // ---------------------------------------------------------
  useEffect(() => {
    let alive = true;

    async function load() {
      mapRef.current = new Map();
      setVersion((v) => v + 1);

      try {
        const ctx = await getCtx();
        if (!alive) return;

        const res = await fetch(`/api/plantings?layoutId=${encodeURIComponent(ctx.layoutId)}`);
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        if (!res.ok) return;

        const rows = (Array.isArray(json?.rows) ? (json.rows as PlantingRow[]) : []) ?? [];

        if (!alive) return;

        const m = new Map<string, PlantingRow>();
        for (const r of rows) m.set(r.id, r);
        mapRef.current = m;
        setVersion((v) => v + 1);
      } catch {
        // ignore
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [gardenName]);

  // ---------------------------------------------------------
  // Realtime: listen to roseiies.plantings by workplace_id
  // We refresh on events (simple + reliable during bridge phase)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!tenantId) return;

    let alive = true;
    const supabase = createBrowserSupabase();
    let channel: any = null;

    let t: any = null;
    const scheduleReload = () => {
      if (t) clearTimeout(t);
      t = setTimeout(async () => {
        try {
          const ctx = await getCtx();
          if (!alive) return;

          const res = await fetch(`/api/plantings?layoutId=${encodeURIComponent(ctx.layoutId)}`);
          const text = await res.text();
          const json = text ? JSON.parse(text) : null;
          if (!res.ok) return;

          const rows = (Array.isArray(json?.rows) ? (json.rows as PlantingRow[]) : []) ?? [];
          const m = new Map<string, PlantingRow>();
          for (const r of rows) m.set(r.id, r);
          mapRef.current = m;
          setVersion((v) => v + 1);
        } catch {
          // ignore
        }
      }, 140);
    };

    (async () => {
      try {
        const ctx = await getCtx();
        if (!alive) return;

        channel = supabase
          .channel(`roseiies:plantings:designer:${tenantId}:${ctx.workplaceId}:${gardenName}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "roseiies",
              table: "plantings",
              filter: `workplace_id=eq.${ctx.workplaceId}`,
            },
            () => scheduleReload()
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
  }, [tenantId, gardenName]);

  // ---------------------------------------------------------
  // Output: stable array + sanitized for current doc
  // ---------------------------------------------------------
  const rowsRaw = useMemo(() => {
    void version;
    return Array.from(mapRef.current.values());
  }, [version]);

  const rows = useMemo(() => sanitizePlantingsForDoc(doc, rowsRaw), [doc, rowsRaw]);

  return { rows };
}
