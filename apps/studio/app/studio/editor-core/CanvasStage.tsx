"use client";

import { useEffect, useRef, useState } from "react";
import { Group, Stage, Layer, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { LayoutDoc, StudioItem, StudioModule, ItemType, PlantBlock } from "./types";

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
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const [stageSize, setStageSize] = useState({ w: 900, h: 600 });

  // Manual panning state
  const panningRef = useRef<{ active: boolean; startX: number; startY: number; startPosX: number; startPosY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  });

  // selection refs for transformer
  const nodeMapRef = useRef<Map<string, Konva.Node>>(new Map());

  // Smooth sizing
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

  // viewport center world
  useEffect(() => {
    const centerScreen = { x: stageSize.w / 2, y: stageSize.h / 2 };
    props.setViewportCenterWorld(worldFromScreen(centerScreen));
  }, [stageSize.w, stageSize.h, props.stagePos.x, props.stagePos.y, props.stageScale]);

  // transformer binding for multi-select
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
  }, [props.selectedIds, props.doc.items]);

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

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    props.setStagePos(newPos);
  }

  function onMouseDown(e: any) {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const clickedOnEmpty = e.target === stage;

    // If pan mode and empty space -> start panning
    if (props.panMode && clickedOnEmpty) {
      panningRef.current = {
        active: true,
        startX: pointer.x,
        startY: pointer.y,
        startPosX: props.stagePos.x,
        startPosY: props.stagePos.y,
      };
      return;
    }

    // If clicked empty space (not pan), clear selection and create item
    if (clickedOnEmpty) {
      props.setSelectedIds([]);
      const world = worldFromScreen(pointer);
      props.onAddItemAtWorld({ type: props.tool, x: world.x - 90, y: world.y - 60 });
      return;
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
  const itemsSorted = [...props.doc.items].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  return (
    <section className="relative h-full w-full bg-[#fbfbfb]" ref={wrapRef}>
      <div className="absolute left-4 top-4 z-10 rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs text-black/70 shadow-sm backdrop-blur">
        Canvas · {props.doc.items.length} items · Selected: {props.selectedIds.length}
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
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={props.doc.canvas.width}
            height={props.doc.canvas.height}
            fill="rgba(255,255,255,0.92)"
            stroke="rgba(2,6,23,0.08)"
            strokeWidth={2}
            cornerRadius={18}
          />

          {itemsSorted.map((item) => (
            <ItemNode
              key={item.id}
              item={item}
              selected={props.selectedIds.includes(item.id)}
              onRegister={(node) => {
                if (node) nodeMapRef.current.set(item.id, node);
                else nodeMapRef.current.delete(item.id);
              }}
              onSelect={(evt) => toggleSelect(item.id, evt.shiftKey)}
              onChange={(patch) => props.onUpdateItem(item.id, patch)}
            />
          ))}

          <Transformer
            ref={trRef}
            rotateEnabled
            keepRatio={false}
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
            borderStroke="rgba(15,23,42,0.55)"
            anchorStroke="rgba(15,23,42,0.55)"
            anchorFill="rgba(255,255,255,0.95)"
            anchorSize={10}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 24 || newBox.height < 24) return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </section>
  );
}

function ItemNode(props: {
  item: StudioItem;
  selected: boolean;
  onRegister: (node: Konva.Node | null) => void;
  onSelect: (evt: { shiftKey: boolean }) => void;
  onChange: (patch: Partial<StudioItem>) => void;
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

  return (
    <Group
      ref={groupRef}
      x={props.item.x}
      y={props.item.y}
      rotation={props.item.r}
      draggable
      onClick={(e) => props.onSelect({ shiftKey: e.evt.shiftKey })}
      onTap={() => props.onSelect({ shiftKey: false })}
      onDragEnd={(e) => props.onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Group;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale after applying to width/height
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
        stroke={props.selected ? "rgba(15,23,42,0.58)" : stroke}
        strokeWidth={props.selected ? Math.max(2, s.strokeWidth + 0.8) : s.strokeWidth}
        cornerRadius={s.radius}
        shadowColor={shadowColor}
        shadowBlur={shadow?.blur ?? 0}
        shadowOffsetX={shadow?.offsetX ?? 0}
        shadowOffsetY={shadow?.offsetY ?? 0}
        shadowEnabled={!!shadow && shadow.opacity > 0}
      />

      {/* Title */}
      <Text
        x={14}
        y={10}
        text={props.item.label}
        fontSize={14}
        fill="rgba(15,23,42,0.90)"
        listening={false}
      />

      {/* Optional: first 2 plant names */}
      {props.item.type === "bed" && plants.length ? (
        <>
          {plants.slice(0, 2).map((p, idx) => (
            <Text
              key={p.id}
              x={14}
              y={32 + idx * 14}
              text={`• ${p.name}`}
              fontSize={11}
              fill="rgba(15,23,42,0.58)"
              listening={false}
            />
          ))}
        </>
      ) : null}
    </Group>
  );
}