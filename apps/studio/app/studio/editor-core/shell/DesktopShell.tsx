"use client";

import LeftToolbar from "../LeftToolbar";
import Inspector from "../Inspector";
import CanvasStage from "../canvas";
import PanelHeader from "./desktop/PanelHeader";
import CollapsedRail from "./desktop/CollapsedRail";

export default function DesktopShell(props: {
  leftOpen: boolean;
  setLeftOpen: (v: boolean) => void;
  rightOpen: boolean;
  setRightOpen: (v: boolean) => void;

  module: any;
  store: any;
  canvasProps: any;

  // Left toolbar action props
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;

  canDuplicate: boolean;
  canLock: boolean;
  canDelete: boolean;
  isLockedSelection: boolean;
  onDuplicate: () => void;
  onToggleLock: () => void;

  canReorder: boolean;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  const LEFT_OPEN_W = 280;
  const RIGHT_OPEN_W = 380;
  const RAIL_W = 22;

  const leftW = props.leftOpen ? LEFT_OPEN_W : RAIL_W;
  const rightW = props.rightOpen ? RIGHT_OPEN_W : RAIL_W;

  return (
    <div className="hidden md:flex gap-3 mt-3 min-h-[calc(100vh-56px-56px-28px)]">
      {/* LEFT */}
      <div className="shrink-0 transition-[width] duration-300 ease-out" style={{ width: leftW }}>
        <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
          {props.leftOpen ? (
            <div className="h-full p-3">
              <PanelHeader title="Tools" side="left" onCollapse={() => props.setLeftOpen(false)} />
              <div className="pt-2">
                <LeftToolbar
                  module={props.module}
                  tool={props.store.tool}
                  setTool={(t: any) => {
                    props.store.setTool(t);
                    props.store.quickInsert(t);
                  }}
                  // Quick actions
                  canDuplicate={props.canDuplicate}
                  canLock={props.canLock}
                  canDelete={props.canDelete}
                  isLockedSelection={props.isLockedSelection}
                  onDuplicate={props.onDuplicate}
                  onToggleLock={props.onToggleLock}
                  onDelete={props.store.deleteSelected}
                  // Snap / Grid
                  showGrid={props.showGrid}
                  setShowGrid={props.setShowGrid}
                  snapToGrid={props.snapToGrid}
                  setSnapToGrid={props.setSnapToGrid}
                  // Layers
                  canReorder={props.canReorder}
                  onBringForward={props.onBringForward}
                  onSendBackward={props.onSendBackward}
                  onBringToFront={props.onBringToFront}
                  onSendToBack={props.onSendToBack}
                />
              </div>
            </div>
          ) : (
            <CollapsedRail side="left" title="Tools" onExpand={() => props.setLeftOpen(true)} />
          )}
        </div>
      </div>

      {/* CENTER */}
      <div className="flex-1 rounded-2xl border border-black/10 bg-white/40 shadow-sm overflow-hidden relative">
        <CanvasStage {...props.canvasProps} />
      </div>

      {/* RIGHT */}
      <div className="shrink-0 transition-[width] duration-300 ease-out" style={{ width: rightW }}>
        <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
          {props.rightOpen ? (
            <div className="h-full p-3">
              <PanelHeader title="Inspector" side="right" onCollapse={() => props.setRightOpen(false)} />
              <div className="pt-2 h-[calc(100%-40px)] overflow-auto">
                <Inspector
                  module={props.module}
                  selectedIds={props.store.selectedIds}
                  selected={props.store.selected}
                  selectedItems={props.store.selectedItems}
                  onUpdateItem={props.store.updateItem}
                  onUpdateMeta={props.store.updateMeta}
                  onUpdateStyle={props.store.updateStyle}
                  onAddPlant={props.store.addPlantToBed}
                  onUpdatePlant={props.store.updatePlant}
                  onRemovePlant={props.store.removePlant}
                />
              </div>
            </div>
          ) : (
            <CollapsedRail side="right" title="Inspector" onExpand={() => props.setRightOpen(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
