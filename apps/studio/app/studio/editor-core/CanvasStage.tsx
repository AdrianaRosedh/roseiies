"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Stage, Layer, Rect, Text, Transformer, Line, Circle  } from "react-konva";
import type Konva from "konva";
import type { LayoutDoc, StudioItem, StudioModule, ItemType } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function rgba(hex: string, opacity: number) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

type ScreenBox = { left: number; top: number; width: number; height: number } | null;
type WorldBox = { x: number; y: number; width: number; height: number } | null;

export default function CanvasStage(props: {
  module: StudioModule;
  doc: LayoutDoc;
  tool: ItemType;

  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;

  panMode: boolean;

  stageScale: number;
  setStageScale: (s: number) => void;

  stagePos: { x: number; y: number };
  setStagePos: (p: { x: number; y: number }) => void;

  onAddItemAtWorld: (args: { type: ItemType; x: number; y: number }) => void;
  onUpdateItem: (id: string, patch: Partial<StudioItem>) => void;

  setCursorWorld: (pos: { x: number; y: number } | null) => void;
  setViewportCenterWorld: (pos: { x: number; y: number } | null) => void;

  // ✅ NEW: wired toolbar actions
  onCopySelected: () => void;
  onPasteAtCursor: () => void;
  onDeleteSelected: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const [stageSize, setStageSize] = useState({ w: 900, h: 600 });
  const [toolbarBox, setToolbarBox] = useState<ScreenBox>(null);
  const [selectionWorldBox, setSelectionWorldBox] = useState<WorldBox>(null);

  const panningRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  });

  const nodeMapRef = useRef<Map<string, Konva.Node>>(new Map());

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStageSize({
        w: Math.max(320, Math.floor(r.width)),
        h: Math.max(320, Math.floor(r.height)),
      });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function worldFromScreen(pointer: { x: number; y: number }) {
    return {
      x: (pointer.x - props.stagePos.x) / props.stageScale,
      y: (pointer.y - props.stagePos.y) / props.stageScale,
    };
  }

  // Keep viewport center updated
  useEffect(() => {
    props.setViewportCenterWorld(worldFromScreen({ x: stageSize.w / 2, y: stageSize.h / 2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageSize.w, stageSize.h, props.stagePos.x, props.stagePos.y, props.stageScale]);

  // Transformer binding
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;

    const nodes: Konva.Node[] = [];
    for (const id of props.selectedIds) {
      const n = nodeMapRef.current.get(id);
      if (n) nodes.push(n);
    }
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();

    queueMicrotask(updateSelectionUI);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedIds, props.doc.items]);

  // Update selection overlay/toolbar when viewport changes
  useEffect(() => {
    queueMicrotask(updateSelectionUI);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.stagePos.x, props.stagePos.y, props.stageScale, stageSize.w, stageSize.h]);

  function updateSelectionUI() {
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    if (!stage || !wrap) {
      setToolbarBox(null);
      setSelectionWorldBox(null);
      return;
    }
    if (props.selectedIds.length === 0) {
      setToolbarBox(null);
      setSelectionWorldBox(null);
      return;
    }

    const tr = trRef.current;
    const nodeForRect = tr ?? nodeMapRef.current.get(props.selectedIds[0]);
    if (!nodeForRect) {
      setToolbarBox(null);
      setSelectionWorldBox(null);
      return;
    }

    const rect = (nodeForRect as any).getClientRect?.({ skipTransform: false }) as
      | { x: number; y: number; width: number; height: number }
      | undefined;

    if (!rect) {
      setToolbarBox(null);
      setSelectionWorldBox(null);
      return;
    }

    // world box for overlay rect
    setSelectionWorldBox({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });

    // screen box for HTML toolbar
    const left = props.stagePos.x + rect.x * props.stageScale;
    const top = props.stagePos.y + rect.y * props.stageScale;
    const width = rect.width * props.stageScale;
    const height = rect.height * props.stageScale;

    setToolbarBox({ left, top, width, height });
  }

  function onWheel(e: any) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = props.stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.04;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = clamp(newScale, 0.35, 2.6);

    const mousePointTo = {
      x: (pointer.x - props.stagePos.x) / oldScale,
      y: (pointer.y - props.stagePos.y) / oldScale,
    };

    props.setStageScale(newScale);
    props.setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });

    queueMicrotask(updateSelectionUI);
  }

  function isEmptyHit(e: any) {
    const stage = stageRef.current;
    if (!stage) return false;
    return e.target === stage;
  }

  function startPan(pointer: { x: number; y: number }) {
    panningRef.current = {
      active: true,
      startX: pointer.x,
      startY: pointer.y,
      startPosX: props.stagePos.x,
      startPosY: props.stagePos.y,
    };
  }

  function onMouseDown(e: any) {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (props.panMode && isEmptyHit(e)) {
      startPan(pointer);
      return;
    }

    if (isEmptyHit(e)) {
      props.setSelectedIds([]);
      setToolbarBox(null);
      setSelectionWorldBox(null);
    }
  }

  function onDblClick(e: any) {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (isEmptyHit(e)) {
      const world = worldFromScreen(pointer);
      props.onAddItemAtWorld({ type: props.tool, x: world.x - 90, y: world.y - 60 });
    }
  }

  function onMouseMove() {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    props.setCursorWorld(worldFromScreen(pointer));

    if (panningRef.current.active) {
      const dx = pointer.x - panningRef.current.startX;
      const dy = pointer.y - panningRef.current.startY;
      props.setStagePos({
        x: panningRef.current.startPosX + dx,
        y: panningRef.current.startPosY + dy,
      });
    }
  }

  function onMouseUp() {
    panningRef.current.active = false;
  }

  function toggleSelect(id: string, additive: boolean) {
    if (!additive) {
      props.setSelectedIds([id]);
      return;
    }
    const set = new Set(props.selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    props.setSelectedIds(Array.from(set));
  }

  const itemsSorted = useMemo(
    () => [...props.doc.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [props.doc.items]
  );

  // Garden grid
  const gridStep = 80;
  const gridLinesX: number[] = [];
  const gridLinesY: number[] = [];
  for (let x = 0; x <= props.doc.canvas.width; x += gridStep) gridLinesX.push(x);
  for (let y = 0; y <= props.doc.canvas.height; y += gridStep) gridLinesY.push(y);

  // Selection states
  const selectedItems = useMemo(() => {
    const set = new Set(props.selectedIds);
    return props.doc.items.filter((i) => set.has(i.id));
  }, [props.doc.items, props.selectedIds]);

  const anyLocked = selectedItems.some((it) => (it.meta as any)?.locked);

  function duplicateSelected() {
    props.onCopySelected();
    props.onPasteAtCursor();
  }

  function deleteSelected() {
    props.onDeleteSelected();
  }

  function toggleLockSelected() {
    for (const it of selectedItems) {
      const locked = Boolean((it.meta as any)?.locked);
      props.onUpdateItem(it.id, { meta: { ...(it.meta as any), locked: !locked } });
    }
    queueMicrotask(updateSelectionUI);
  }

  return (
    <section
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden"
      style={{
        cursor: props.panMode ? "grab" : "default",
        background:
          "radial-gradient(circle at 30% 15%, rgba(255,255,255,0.95), rgba(249,247,242,1) 45%, rgba(244,240,232,1) 100%)",
      }}
    >
      {/* Canva-like floating toolbar (wired) */}
      {toolbarBox ? (
        <FloatingToolbar
          box={toolbarBox}
          multi={props.selectedIds.length > 1}
          locked={anyLocked}
          onDuplicate={duplicateSelected}
          onToggleLock={toggleLockSelected}
          onDelete={deleteSelected}
        />
      ) : null}

      <div className="absolute left-4 top-4 z-10 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-xs text-black/70 shadow-sm backdrop-blur">
        Plot · {props.doc.items.length} items · Selected: {props.selectedIds.length} ·{" "}
        {props.panMode ? "Pan ON" : "Double-click to place"}
      </div>

      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        x={props.stagePos.x}
        y={props.stagePos.y}
        scaleX={props.stageScale}
        scaleY={props.stageScale}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDblClick={onDblClick}
      >
        <Layer>
          {/* Plot surface */}
          <Rect
            x={0}
            y={0}
            width={props.doc.canvas.width}
            height={props.doc.canvas.height}
            fill="rgba(255,255,255,0.86)"
            stroke="rgba(2,6,23,0.09)"
            strokeWidth={2}
            cornerRadius={22}
            shadowColor="rgba(15,23,42,0.12)"
            shadowBlur={18}
            shadowOffsetX={0}
            shadowOffsetY={10}
            shadowEnabled
            listening={false}
          />

          {/* Subtle grid */}
          {gridLinesX.map((x) => (
            <Line
              key={`gx-${x}`}
              points={[x, 0, x, props.doc.canvas.height]}
              stroke="rgba(34,54,44,0.06)"
              strokeWidth={1}
              listening={false}
            />
          ))}
          {gridLinesY.map((y) => (
            <Line
              key={`gy-${y}`}
              points={[0, y, props.doc.canvas.width, y]}
              stroke="rgba(34,54,44,0.06)"
              strokeWidth={1}
              listening={false}
            />
          ))}

          {/* ✅ Canva-like selection overlay (rounded + soft) */}
          {selectionWorldBox ? (
            (() => {
              const cx = selectionWorldBox.x + selectionWorldBox.width / 2;
              const nubTop = selectionWorldBox.y - 22; // distance above box
              const nubBottom = selectionWorldBox.y - 6;
            
              return (
                <>
                  <Line
                    points={[cx, nubBottom, cx, nubTop]}
                    stroke="rgba(111, 102, 255, 0.45)"
                    strokeWidth={1.2}
                    listening={false}
                  />
                  <Circle
                    x={cx}
                    y={nubTop}
                    radius={6}
                    fill="rgba(255,255,255,0.98)"
                    stroke="rgba(111, 102, 255, 0.55)"
                    strokeWidth={1.2}
                    shadowColor="rgba(111, 102, 255, 0.18)"
                    shadowBlur={12}
                    shadowOffsetX={0}
                    shadowOffsetY={6}
                    listening={false}
                  />
                </>
              );
            })()
          ) : null}


          {itemsSorted.map((item) => (
            <ItemNode
              key={item.id}
              item={item}
              selected={props.selectedIds.includes(item.id)}
              locked={Boolean((item.meta as any)?.locked)}
              onRegister={(node) => {
                if (node) nodeMapRef.current.set(item.id, node);
                else nodeMapRef.current.delete(item.id);
              }}
              onSelect={(evt) => toggleSelect(item.id, evt.shiftKey)}
              onChange={(patch) => {
                if (Boolean((item.meta as any)?.locked)) return;
                props.onUpdateItem(item.id, patch);
                queueMicrotask(updateSelectionUI);
              }}
              onMove={() => queueMicrotask(updateSelectionUI)}
            />
          ))}

          {/* Transformer: anchors only, border hidden (overlay provides border) */}
          <Transformer
            ref={trRef}
            rotateEnabled
            keepRatio={false}
            padding={6}
            borderStroke="rgba(0,0,0,0)"
            borderStrokeWidth={0}
            anchorSize={9}
            anchorCornerRadius={9}
            anchorStroke="rgba(111, 102, 255, 0.55)"
            anchorStrokeWidth={1.2}
            anchorFill="rgba(255,255,255,0.98)"
            rotateAnchorOffset={24}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "middle-left",
              "middle-right",
              "top-center",
              "bottom-center",
            ]}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 24 || newBox.height < 24) return oldBox;
              return newBox;
            }}
            onTransform={() => queueMicrotask(updateSelectionUI)}
            onTransformEnd={() => queueMicrotask(updateSelectionUI)}
          />
        </Layer>
      </Stage>
    </section>
  );
}

function ItemNode(props: {
  item: StudioItem;
  selected: boolean;
  locked: boolean;
  onRegister: (node: Konva.Node | null) => void;
  onSelect: (evt: { shiftKey: boolean }) => void;
  onChange: (patch: Partial<StudioItem>) => void;
  onMove: () => void;
}) {
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    props.onRegister(groupRef.current);
    return () => props.onRegister(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = props.item.style;
  const fill = rgba(s.fill, s.fillOpacity);
  const stroke = rgba(s.stroke, s.strokeOpacity);
  const shadow = s.shadow;
  const shadowColor = shadow ? rgba(shadow.color, shadow.opacity) : "transparent";
  const plants = props.item.meta.plants ?? [];
  const plantAccent = plants[0]?.color ?? "#5e7658";

  return (
    <Group
      ref={groupRef}
      x={props.item.x}
      y={props.item.y}
      rotation={props.item.r}
      draggable={!props.locked}
      opacity={props.locked ? 0.92 : 1}
      onClick={(e) => props.onSelect({ shiftKey: e.evt.shiftKey })}
      onTap={() => props.onSelect({ shiftKey: false })}
      onDragMove={() => props.onMove()}
      onDragEnd={(e) => props.onChange({ x: e.target.x(), y: e.target.y() })}
      onTransform={() => props.onMove()}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Group;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        props.onChange({
          x: node.x(),
          y: node.y(),
          w: Math.max(24, props.item.w * scaleX),
          h: Math.max(24, props.item.h * scaleY),
          r: node.rotation(),
        });
      }}
    >
      <Rect
        width={props.item.w}
        height={props.item.h}
        fill={fill}
        stroke={props.selected ? "rgba(15,23,42,0.28)" : stroke}
        strokeWidth={props.selected ? 1.4 : s.strokeWidth}
        cornerRadius={Math.max(18, s.radius)}
        shadowColor={shadowColor}
        shadowBlur={shadow?.blur ?? 10}
        shadowOffsetX={shadow?.offsetX ?? 0}
        shadowOffsetY={shadow?.offsetY ?? 10}
        shadowEnabled
      />

      {props.item.type === "bed" ? (
        <Rect
          x={0}
          y={0}
          width={props.item.w}
          height={10}
          fill={plantAccent}
          opacity={0.16}
          cornerRadius={[18, 18, 0, 0] as any}
          listening={false}
        />
      ) : null}

      <Text
        x={14}
        y={12}
        text={props.item.label}
        fontSize={14}
        fill="rgba(15,23,42,0.90)"
        listening={false}
      />

      {props.locked ? (
        <Text
          x={props.item.w - 22}
          y={10}
          text="🔒"
          fontSize={12}
          listening={false}
          opacity={0.7}
        />
      ) : null}
    </Group>
  );
}

/* ---------------- Floating toolbar ---------------- */

function FloatingToolbar(props: {
  box: { left: number; top: number; width: number; height: number };
  multi: boolean;
  locked: boolean;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}) {
  const { left, top, width } = props.box;
  const x = left + width / 2;
  const y = top - 12;

  return (
    <div
      className="absolute z-30"
      style={{ left: x, top: y, transform: "translate(-50%, -100%)" }}
    >
      <div className="flex items-center gap-1 rounded-full border border-black/10 bg-white/88 shadow-md backdrop-blur px-2 py-1">
        <ToolIconButton title="Duplicate" onClick={props.onDuplicate}>
          <IconDuplicate />
        </ToolIconButton>

        <ToolIconButton title={props.locked ? "Unlock" : "Lock"} onClick={props.onToggleLock}>
          {props.locked ? <IconUnlock /> : <IconLock />}
        </ToolIconButton>

        <div className="w-px h-5 bg-black/10 mx-1" />

        <ToolIconButton title="Delete" onClick={props.onDelete} danger>
          <IconTrash />
        </ToolIconButton>

        <span className="ml-1 text-[11px] text-black/45 select-none hidden lg:inline">
          {props.multi ? "Selection" : "Shape"}
        </span>
      </div>
    </div>
  );
}

function ToolIconButton(props: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={props.title}
      onClick={props.onClick}
      className={[
        "h-8 w-8 inline-flex items-center justify-center rounded-full transition",
        props.danger ? "hover:bg-red-500/10 text-red-700" : "hover:bg-black/5 text-black/80",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

/* ---------------- Icons ---------------- */

function IconDuplicate() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7 7h8v8H7V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M5 13H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6.5 9V7.2A3.5 3.5 0 0 1 10 3.7a3.5 3.5 0 0 1 3.5 3.5V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 9h8a1 1 0 0 1 1 1v5.3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconUnlock() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M13.5 9V7.5A3.5 3.5 0 0 0 10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M6 9h8a1 1 0 0 1 1 1v5.3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7 6h6M8 6V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M6.5 6.5l.6 10a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
