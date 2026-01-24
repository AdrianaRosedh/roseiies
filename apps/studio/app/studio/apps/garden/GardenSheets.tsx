"use client";

import { useMemo } from "react";
import type { PortalContext } from "../../../lib/portal/getPortalContext";

import GardenSheetsToolbar from "./sheets/components/GardenSheetsToolbar";
import GardenSheetsGrid from "./sheets/components/GardenSheetsGrid";

import { useGardenSheetCells } from "./sheets/hooks/useGardenSheetCells";
import { useGardenSheetColumns } from "./sheets/hooks/useGardenSheetColumns";
import { usePlantings } from "./sheets/hooks/usePlantings";
import { useGardenSheetsModel } from "./sheets/hooks/useGardenSheetsModel";

import type { Column, PlantingRow } from "./sheets/types";

export default function GardenSheets({
  store,
  portal,
  onGoDesign,
}: {
  store: any;
  portal: PortalContext;
  onGoDesign?: () => void;
}) {
  const activeGarden = useMemo(
    () => store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ?? null,
    [store.state]
  );

  const doc = useMemo(() => {
    const id = store.state.activeLayoutId;
    if (!id) return null;
    return store.state.docs[id] ?? null;
  }, [store.state]);

  const beds = useMemo(() => {
    const items = doc?.items ?? [];
    return items.filter((it: any) => it.type === "bed");
  }, [doc]);

  const gardenName = activeGarden?.name ?? "";

  function bedLabel(id: string | null) {
    if (!id) return "";
    const bed = beds.find((b: any) => b.id === id);
    const code = bed?.meta?.code ? ` (${bed.meta.code})` : "";
    return (bed?.label ?? id) + code;
  }

  function zonesForBed(bedId: string | null) {
    if (!bedId) return [];
    const bed = beds.find((b: any) => b.id === bedId);
    const zones = bed?.meta?.zones;
    if (!Array.isArray(zones)) return [];
    return zones
      .map((z: any) => String(z?.code ?? "").trim())
      .filter(Boolean);
  }

  // columns + custom cells persistence
  const { cols, setCols } = useGardenSheetColumns({ tenantId: portal.tenantId });
  const { customCells, setCustomCells } = useGardenSheetCells({
    tenantId: portal.tenantId,
    gardenName,
  });

  // plantings data (source of truth)
  const { rows, setRows, loading, refresh, createPlanting, patchPlanting } = usePlantings({
    gardenName,
    tenantId: portal.tenantId,
  });

  // model (editing state machine + display/select helpers)
  const model = useGardenSheetsModel({
    cols,
    beds,
    bedLabel,
    zonesForBed,

    rows,
    setRows: (updater) => setRows(updater),

    customCells,
    setCustomCells: (updater) => setCustomCells(updater),

    createPlanting: async (draft) => {
      const res = await createPlanting(draft);
      if (res.ok) return { ok: true as const, created: res.created };
      return { ok: false as const, error: res.error };
    },

    patchPlanting: async (id, patch) => {
      await patchPlanting(id, patch);
    },
  });

  const onAddColumn = () => {
    const key = `field_${Math.random().toString(16).slice(2)}`;
    const newCol: Column = { key, label: "New field", type: "text", width: 180 };
    setCols((prev: Column[]) => [...prev, newCol]);
  };

  return (
    <div className="w-full">
      <GardenSheetsToolbar
        gardenName={gardenName}
        loading={loading}
        onRefresh={refresh}
        onAddColumn={onAddColumn}
        onGoDesign={onGoDesign}
      />

      <GardenSheetsGrid
        cols={cols}
        setCols={setCols}
        rows={rows as PlantingRow[]}
        draftRow={model.draftRow}
        editing={model.editing}
        draft={model.draft}
        setDraft={model.setDraft}
        startEdit={model.startEdit}
        stopEdit={model.stopEdit}
        commitEdit={model.commitEdit}
        getCellValue={model.getCellValue}
        renderCellDisplay={model.renderCellDisplay}
        renderSelectEditor={model.renderSelectEditor}
      />
    </div>
  );
}