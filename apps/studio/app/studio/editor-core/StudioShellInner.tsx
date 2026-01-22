"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StudioModule } from "./types";
import type { PortalContext } from "../../lib/portal/getPortalContext";
import TopBar from "./TopBar";
import LeftToolbar from "./LeftToolbar";
import Inspector from "./Inspector";
import CanvasStage from "./CanvasStage";

type MobileSheetKind = "context" | "tools" | "inspector" | "more" | null;

export default function StudioShellInner({
  module,
  store,
  portal,
  onBack,
}: {
  module: StudioModule;
  store: any;
  portal: PortalContext;
  onBack?: () => void;
}) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Mobile UI state
  const [mobileSheet, setMobileSheet] = useState<MobileSheetKind>(null);

  const activeGarden = useMemo(
    () =>
      store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ??
      null,
    [store.state]
  );

  const layoutsForGarden = useMemo(() => {
    if (!store.state.activeGardenId) return [];
    return store.state.layouts
      .filter((l: any) => l.gardenId === store.state.activeGardenId)
      .sort((a: any, b: any) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [store.state]);

  const activeLayout = useMemo(
    () =>
      store.state.layouts.find((l: any) => l.id === store.state.activeLayoutId) ??
      null,
    [store.state]
  );

  const doc = useMemo(() => {
    const id = store.state.activeLayoutId;
    if (!id) return store.emptyDoc();
    return store.state.docs[id] ?? store.emptyDoc();
  }, [store.state.activeLayoutId, store.state.docs]);


  const LEFT_OPEN_W = 280;
  const RIGHT_OPEN_W = 380;
  const RAIL_W = 22;

  const leftW = leftOpen ? LEFT_OPEN_W : RAIL_W;
  const rightW = rightOpen ? RIGHT_OPEN_W : RAIL_W;

  const canCopy = store.selectedIds.length > 0;
  const canPaste = !!store.clipboard;
  const canDelete = store.selectedIds.length > 0;

  const toggleSheet = (k: Exclude<MobileSheetKind, null>) =>
    setMobileSheet((v) => (v === k ? null : k));

  // ✅ NEW: selection helpers for the Garden Design palette
  const selectedCount = store.selectedIds.length;

  function applyStyleToSelected(patch: any) {
    if (!store?.selectedItems?.length) return;
    store.selectedItems.forEach((it: any) => store.updateStyle?.(it.id, patch));
  }

  return (
    <div className="w-full">
      <TopBar
        module={module}
        state={store.state}
        activeGarden={activeGarden}
        layoutsForGarden={layoutsForGarden}
        activeLayout={activeLayout}
        stageScale={store.stageScale}
        panMode={store.panMode}
        onBack={onBack}
        onSetGarden={store.setActiveGarden}
        onSetLayout={store.setActiveLayout}
        onNewGarden={store.newGarden}
        onRenameGarden={store.renameGarden}
        onNewLayout={store.newLayout}
        onRenameLayout={store.renameLayout}
        onPublish={() => store.publishLayout?.(portal.tenantId)}
        onResetView={store.resetView}
        onCopy={store.copySelected}
        onPaste={store.pasteAtCursor}
        onDelete={store.deleteSelected}
        canCopy={canCopy}
        canPaste={canPaste}
        canDelete={canDelete}
        // ✅ Wire mobile header buttons
        onOpenMobileMore={() => toggleSheet("more")}
        onOpenMobileContext={() => toggleSheet("context")}
      />

      {/* Desktop: left rail | canvas | right rail */}
      <div className="hidden md:flex gap-3 mt-3 min-h-[calc(100vh-56px-56px-28px)]">
        {/* LEFT */}
        <div
          className="shrink-0 transition-[width] duration-300 ease-out"
          style={{ width: leftW }}
        >
          <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
            {leftOpen ? (
              <div className="h-full p-3">
                <PanelHeader
                  title="Tools"
                  side="left"
                  onCollapse={() => setLeftOpen(false)}
                />
                <div className="pt-2">
                  <LeftToolbar
                    module={module}
                    tool={store.tool}
                    setTool={(t: any) => {
                      store.setTool(t);
                      store.quickInsert(t);
                    }}
                    // ✅ Garden Design palette wiring
                    bedDefaultStyle={store.stylesByType?.bed}
                    onSetBedDefaultStyle={(patch: any) =>
                      store.setDefaultStyle?.("bed", patch)
                    }
                    selectedCount={selectedCount}
                    onApplyStyleToSelected={(patch: any) =>
                      applyStyleToSelected(patch)
                    }
                  />
                </div>
              </div>
            ) : (
              <CollapsedRail
                side="left"
                title="Tools"
                onExpand={() => setLeftOpen(true)}
              />
            )}
          </div>
        </div>

        {/* CENTER */}
        <div className="flex-1 rounded-2xl border border-black/10 bg-white/40 shadow-sm overflow-hidden relative">
          <CanvasStage
            module={module}
            doc={doc}
            tool={store.tool}
            selectedIds={store.selectedIds}
            setSelectedIds={store.setSelectedIds}
            panMode={store.panMode}
            stageScale={store.stageScale}
            setStageScale={store.setStageScale}
            stagePos={store.stagePos}
            setStagePos={store.setStagePos}
            onAddItemAtWorld={store.addItemAtWorld}
            onUpdateItem={store.updateItem}
            onUpdateCanvas={(patch) =>
              store.updateLayoutDoc({
                canvas: { ...doc.canvas, ...patch },
              })
            }
            setCursorWorld={store.setCursorWorld}
            setViewportCenterWorld={store.setViewportCenterWorld}
            onCopySelected={store.copySelected}
            onPasteAtCursor={store.pasteAtCursor}
            onDeleteSelected={store.deleteSelected}
          />
        </div>

        {/* RIGHT */}
        <div
          className="shrink-0 transition-[width] duration-300 ease-out"
          style={{ width: rightW }}
        >
          <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
            {rightOpen ? (
              <div className="h-full p-3">
                <PanelHeader
                  title="Inspector"
                  side="right"
                  onCollapse={() => setRightOpen(false)}
                />
                <div className="pt-2 h-[calc(100%-40px)] overflow-auto">
                  <Inspector
                    module={module}
                    selectedIds={store.selectedIds}
                    selected={store.selected}
                    selectedItems={store.selectedItems}
                    onUpdateItem={store.updateItem}
                    onUpdateMeta={store.updateMeta}
                    onUpdateStyle={store.updateStyle}
                    onAddPlant={store.addPlantToBed}
                    onUpdatePlant={store.updatePlant}
                    onRemovePlant={store.removePlant}
                  />
                </div>
              </div>
            ) : (
              <CollapsedRail
                side="right"
                title="Inspector"
                onExpand={() => setRightOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile: canvas + bottom bar + sheets */}
      <div className="md:hidden mt-3 rounded-2xl border border-black/10 bg-white/40 shadow-sm overflow-hidden relative h-[calc(100vh-56px-56px-28px)]">
        <CanvasStage
          module={module}
          doc={doc}
          tool={store.tool}
          selectedIds={store.selectedIds}
          setSelectedIds={store.setSelectedIds}
          panMode={store.panMode}
          stageScale={store.stageScale}
          setStageScale={store.setStageScale}
          stagePos={store.stagePos}
          setStagePos={store.setStagePos}
          onAddItemAtWorld={store.addItemAtWorld}
          onUpdateItem={store.updateItem}
          onUpdateCanvas={(patch) =>
            store.updateLayoutDoc({
              canvas: { ...doc.canvas, ...patch },
            })
          }
          setCursorWorld={store.setCursorWorld}
          setViewportCenterWorld={store.setViewportCenterWorld}
          onCopySelected={store.copySelected}
          onPasteAtCursor={store.pasteAtCursor}
          onDeleteSelected={store.deleteSelected}
        />

        {/* Floating bottom bar */}
        <MobileBottomBar
          active={mobileSheet}
          canCopy={canCopy}
          canPaste={canPaste}
          canDelete={canDelete}
          onTools={() => toggleSheet("tools")}
          onInspector={() => toggleSheet("inspector")}
          onMore={() => toggleSheet("more")}
        />

        {/* Context sheet (Garden/Layout) */}
        <MobileSheet
          open={mobileSheet === "context"}
          title="Garden · Layout"
          onClose={() => setMobileSheet(null)}
          heightClassName="h-[62vh]"
        >
          <div className="p-3 space-y-3">
            <div className="space-y-2">
              <div className="text-[11px] text-black/55">Garden</div>
              <select
                value={store.state.activeGardenId ?? ""}
                onChange={(e) => store.setActiveGarden(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm"
              >
                {store.state.gardens.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-3 text-sm"
                  onClick={() => {
                    const name = prompt("New garden name?");
                    if (name?.trim()) store.newGarden(name.trim());
                  }}
                >
                  + Garden
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-3 text-sm disabled:opacity-40"
                  disabled={!activeGarden}
                  onClick={() => {
                    const name = prompt(
                      "Rename garden:",
                      activeGarden?.name ?? ""
                    );
                    if (name?.trim()) store.renameGarden(name.trim());
                  }}
                >
                  Rename
                </button>
              </div>
            </div>

            <div className="h-px bg-black/10" />

            <div className="space-y-2">
              <div className="text-[11px] text-black/55">Layout</div>
              <select
                value={store.state.activeLayoutId ?? ""}
                onChange={(e) => store.setActiveLayout(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm"
              >
                {layoutsForGarden.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.published ? "● " : ""}
                    {l.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-3 text-sm disabled:opacity-40"
                  disabled={!store.state.activeGardenId}
                  onClick={() => {
                    const name = prompt("New layout name?");
                    if (name?.trim()) store.newLayout(name.trim());
                  }}
                >
                  + Layout
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-3 text-sm disabled:opacity-40"
                  disabled={!activeLayout}
                  onClick={() => {
                    const name = prompt(
                      "Rename layout:",
                      activeLayout?.name ?? ""
                    );
                    if (name?.trim()) store.renameLayout(name.trim());
                  }}
                >
                  Rename
                </button>
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-black/10 bg-[rgba(94,118,88,0.18)] px-4 py-3 text-sm shadow-sm hover:bg-[rgba(94,118,88,0.24)]"
              onClick={() => {
                store.publishLayout?.(portal.tenantId);
                setMobileSheet(null);
              }}
              disabled={!activeLayout}
            >
              Publish
            </button>
          </div>
        </MobileSheet>

        {/* Tools sheet */}
        <MobileSheet
          open={mobileSheet === "tools"}
          title="Tools"
          onClose={() => setMobileSheet(null)}
        >
          <div className="p-3">
            <LeftToolbar
              module={module}
              tool={store.tool}
              setTool={(t: any) => {
                store.setTool(t);
                store.quickInsert(t);
                setMobileSheet(null);
              }}
              // ✅ Garden Design palette wiring
              bedDefaultStyle={store.stylesByType?.bed}
              onSetBedDefaultStyle={(patch: any) =>
                store.setDefaultStyle?.("bed", patch)
              }
              selectedCount={selectedCount}
              onApplyStyleToSelected={(patch: any) => applyStyleToSelected(patch)}
            />
          </div>
        </MobileSheet>

        {/* Inspector sheet */}
        <MobileSheet
          open={mobileSheet === "inspector"}
          title="Inspector"
          onClose={() => setMobileSheet(null)}
          heightClassName="h-[70vh]"
        >
          <div className="p-3 h-full overflow-auto">
            <Inspector
              module={module}
              selectedIds={store.selectedIds}
              selected={store.selected}
              selectedItems={store.selectedItems}
              onUpdateItem={store.updateItem}
              onUpdateMeta={store.updateMeta}
              onUpdateStyle={store.updateStyle}
              onAddPlant={store.addPlantToBed}
              onUpdatePlant={store.updatePlant}
              onRemovePlant={store.removePlant}
            />
          </div>
        </MobileSheet>

        {/* Actions sheet (opened by bottom bar "More" OR top bar "…") */}
        <MobileSheet
          open={mobileSheet === "more"}
          title="Actions"
          onClose={() => setMobileSheet(null)}
        >
          <div className="p-3 space-y-2">
            <MobileActionRow
              label="Reset view"
              onClick={() => {
                store.resetView?.();
                setMobileSheet(null);
              }}
            />
            <MobileActionRow
              label="Copy"
              disabled={!canCopy}
              onClick={() => {
                store.copySelected?.();
                setMobileSheet(null);
              }}
            />
            <MobileActionRow
              label="Paste"
              disabled={!canPaste}
              onClick={() => {
                store.pasteAtCursor?.();
                setMobileSheet(null);
              }}
            />
            <MobileActionRow
              label="Delete"
              danger
              disabled={!canDelete}
              onClick={() => {
                store.deleteSelected?.();
                setMobileSheet(null);
              }}
            />
            <div className="h-px bg-black/10 my-2" />
            <MobileActionRow
              label="Publish"
              onClick={() => {
                store.publishLayout?.(portal.tenantId);
                setMobileSheet(null);
              }}
            />
          </div>
        </MobileSheet>
      </div>
    </div>
  );
}

/* ---------------- Desktop helpers ---------------- */

function PanelHeader({
  title,
  side,
  onCollapse,
}: {
  title: string;
  side: "left" | "right";
  onCollapse: () => void;
}) {
  const Icon = side === "left" ? IconChevronLeft : IconChevronRight;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold text-black/85">{title}</div>
      <button
        onClick={onCollapse}
        className="inline-flex items-center justify-center rounded-lg border border-black/10 bg-white/80 px-2.5 py-2 text-xs shadow-sm hover:bg-white"
        title="Collapse"
        aria-label="Collapse"
        type="button"
      >
        <Icon />
      </button>
    </div>
  );
}

function CollapsedRail({
  side,
  title,
  onExpand,
}: {
  side: "left" | "right";
  title: string;
  onExpand: () => void;
}) {
  const Icon = side === "left" ? IconChevronRight : IconChevronLeft;

  return (
    <button
      onClick={onExpand}
      className="h-full w-full flex flex-col items-center justify-center gap-2 hover:bg-black/2 transition-colors"
      title={`Show ${title}`}
      aria-label={`Show ${title}`}
      type="button"
    >
      <span className="opacity-70 hover:opacity-95 transition-opacity">
        <Icon />
      </span>

      <span
        className="text-[10px] text-black/35 tracking-wide select-none"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {title}
      </span>
    </button>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 4.5L7.5 10l5 5.5"
        stroke="rgba(15,23,42,0.7)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.5 4.5L12.5 10l-5 5.5"
        stroke="rgba(15,23,42,0.7)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------------- Mobile UI ---------------- */

function MobileBottomBar(props: {
  active: MobileSheetKind;
  canCopy: boolean;
  canPaste: boolean;
  canDelete: boolean;
  onTools: () => void;
  onInspector: () => void;
  onMore: () => void;
}) {
  const { active } = props;

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-20 px-3 pb-3"
      style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-140 rounded-2xl border border-black/10 bg-white/92 shadow-lg backdrop-blur px-2 py-2 flex items-center justify-between">
        <MobileBarButton
          label="Tools"
          active={active === "tools"}
          onClick={props.onTools}
          icon={<IconWrench />}
        />
        <div className="w-px h-8 bg-black/10" />
        <MobileBarButton
          label="Inspect"
          active={active === "inspector"}
          onClick={props.onInspector}
          icon={<IconSliders />}
        />
        <div className="w-px h-8 bg-black/10" />
        <MobileBarButton
          label="More"
          active={active === "more"}
          onClick={props.onMore}
          icon={<IconDots />}
        />
      </div>
    </div>
  );
}

function MobileBarButton(props: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "flex-1 min-w-0 px-3 py-2 rounded-xl flex items-center justify-center gap-2",
        props.active ? "bg-black/5 ring-1 ring-black/10" : "hover:bg-black/5",
      ].join(" ")}
      aria-label={props.label}
      title={props.label}
    >
      <span className="opacity-80">{props.icon}</span>
      <span className="text-[12px] text-black/80">{props.label}</span>
    </button>
  );
}

/**
 * ✅ Smooth popup:
 * - Keeps mounted for ~220ms after close so exit animation can play
 * - Backdrop fades
 * - Sheet slides up/down
 */
function MobileSheet(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  heightClassName?: string;
}) {
  const [mounted, setMounted] = useState(props.open);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (props.open) {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      setMounted(true);
      return;
    }
    // close: allow animation to finish
    closeTimer.current = window.setTimeout(() => setMounted(false), 220);
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, [props.open]);

  if (!mounted) return null;

  const open = props.open;

  return (
    <div className="absolute inset-0 z-30">
      {/* Backdrop */}
      <button
        type="button"
        className={[
          "absolute inset-0 bg-black/15 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={props.onClose}
        aria-label="Close sheet"
        style={{ touchAction: "none" }}
      />

      {/* Sheet */}
      <div
        className={[
          "absolute left-0 right-0 bottom-0 mx-auto max-w-175",
          "rounded-t-3xl border border-black/10 bg-white shadow-2xl",
          "transition-transform duration-200 will-change-transform",
          open ? "translate-y-0" : "translate-y-3",
          props.heightClassName ?? "h-[52vh]",
        ].join(" ")}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-black/85">{props.title}</div>
          <button
            type="button"
            onClick={props.onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-black/10 bg-white/80 hover:bg-white"
            aria-label="Close"
            title="Close"
          >
            <IconX />
          </button>
        </div>
        <div className="h-px bg-black/10" />
        <div className="h-full overflow-hidden">{props.children}</div>
      </div>
    </div>
  );
}

function MobileActionRow(props: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={[
        "w-full text-left px-4 py-3 rounded-xl border border-black/10 bg-white/80",
        props.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white",
        props.danger ? "text-red-700" : "text-black/85",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}

/* ---------------- Small icons ---------------- */

function IconWrench() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 3.7a4.2 4.2 0 0 0-3.7 6.2L4.5 14.2a1.5 1.5 0 0 0 2.1 2.1l4.3-4.3a4.2 4.2 0 0 0 6.2-3.7l-2.4 1-1.9-1.9 1-2.4Z"
        stroke="rgba(15,23,42,0.75)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 5h12M4 10h12M4 15h12"
        stroke="rgba(15,23,42,0.75)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 5v0M12 10v0M9 15v0"
        stroke="rgba(15,23,42,0.75)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconDots() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="6" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
      <circle cx="10" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
      <circle cx="14" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="rgba(15,23,42,0.7)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
