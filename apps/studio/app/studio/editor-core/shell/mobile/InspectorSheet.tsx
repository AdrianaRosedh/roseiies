// apps/studio/app/studio/editor-core/shell/mobile/InspectorSheet.tsx
"use client";

import MobileSheet from "../../MobileSheet";
import Inspector from "../../Inspector";
import type { StudioModule } from "../../types";

export default function InspectorSheet(props: {
  open: boolean;
  onClose: () => void;

  module: StudioModule;
  store: any;
}) {
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
          plantings={props.store.plantings ?? undefined}
        />
      </div>
    </MobileSheet>
  );
}