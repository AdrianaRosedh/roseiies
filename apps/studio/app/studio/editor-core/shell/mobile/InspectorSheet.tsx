"use client";

import MobileSheet from "../../MobileSheet";
import Inspector from "../../Inspector";
import type { StudioModule, PlantBlock } from "../../types";

export default function InspectorSheet(props: {
  open: boolean;
  onClose: () => void;

  module: StudioModule;
  store: any;
}) {
  // Inspector expects these signatures; store already matches them.
  const onAddPlant = (bedId: string) => props.store?.addPlantToBed?.(bedId);
  const onUpdatePlant = (bedId: string, plantId: string, patch: Partial<PlantBlock>) =>
    props.store?.updatePlant?.(bedId, plantId, patch);
  const onRemovePlant = (bedId: string, plantId: string) =>
    props.store?.removePlant?.(bedId, plantId);

  return (
    <MobileSheet
      open={props.open}
      title="Inspector"
      onClose={props.onClose}
      heightClassName="h-[70vh]"
    >
      <div className="p-3 h-full overflow-auto">
        <Inspector
          module={props.module}
          selectedIds={props.store.selectedIds}
          selected={props.store.selected}
          selectedItems={props.store.selectedItems}
          onUpdateItem={props.store.updateItem}
          onUpdateMeta={props.store.updateMeta}
          onUpdateStyle={props.store.updateStyle}
          onAddPlant={onAddPlant}
          onUpdatePlant={onUpdatePlant}
          onRemovePlant={onRemovePlant}
        />
      </div>
    </MobileSheet>
  );
}