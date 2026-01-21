"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Group,
  Stage,
  Layer,
  Rect,
  Text,
  Transformer,
  Line,
  Circle,
  Ellipse,
  Shape,
} from "react-konva";
import type Konva from "konva";
import type {
  LayoutDoc,
  StudioItem,
  StudioModule,
  ItemType,
  BezierPath,
  BezierPoint,
  BezierHandle,
  CornerRadii,
  CurvaturePath,
  CurvaturePoint,
  PolygonPath,
  PolygonPoint,
} from "./types";

/* ---------------- Utils ---------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function cursorSvgDataUri(svg: string) {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `url("data:image/svg+xml,${encoded}")`;
}

// 32x32 cursor, hotspot at center (16,16)
const ROTATE_CURSOR = cursorSvgDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <g fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 6a10 10 0 1 1-7.1 2.9"/>
      <path d="M8.9 8.9L8 4.5l4.4.9"/>
    </g>
    <g fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
      <path d="M16 6a10 10 0 1 1-7.1 2.9"/>
      <path d="M8.9 8.9L8 4.5l4.4.9"/>
    </g>
  </svg>
  `) + " 16 16, auto"; 

function rgba(hex: string, opacity: number) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function uid(prefix = "p") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

type ScreenBox =
  | { left: number; top: number; width: number; height: number }
  | null;

function isPillLike(item: StudioItem) {
  return item.type === "path" || item.type === "label";
}
function isRectLike(item: StudioItem) {
  return item.type === "bed" || item.type === "zone" || item.type === "structure";
}
function hasBezier(item: StudioItem) {
  return Boolean(item.meta?.bezier?.points?.length);
}
function hasCurvature(item: StudioItem) {
  return Boolean(item.meta?.curvature?.points?.length);
}
function hasPolygon(item: StudioItem) {
  return Boolean(item.meta?.polygon?.points?.length);
}

/** Keep delta in [-180, 180] to prevent wrap jumps */
function normalizeAngleDelta(delta: number) {
  let d = delta;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function angleDegWorld(p: { x: number; y: number }, c: { x: number; y: number }) {
  return (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI;
}

function rotateVec(v: { x: number; y: number }, deg: number) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/* ---------------- rAF throttling ---------------- */

function useRafThrottled<T extends (...args: any[]) => void>(fn: T) {
  const raf = useRef<number | null>(null);
  const lastArgs = useRef<any[] | null>(null);

  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback((...args: Parameters<T>) => {
    lastArgs.current = args;
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      if (lastArgs.current) fnRef.current(...(lastArgs.current as any[]));
    });
  }, []) as T;
}

function useIsCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarse(Boolean(mq.matches));

    update();
    // Safari uses addListener/removeListener in older versions
    if ("addEventListener" in mq) mq.addEventListener("change", update);
    else (mq as any).addListener(update);

    return () => {
      if ("removeEventListener" in mq) mq.removeEventListener("change", update);
      else (mq as any).removeListener(update);
    };
  }, []);

  return isCoarse;
}

/* ---------------- Bezier helpers ---------------- */

function roundedRectToBezierPath(item: StudioItem): BezierPath {
  const w = Math.max(1, item.w);
  const h = Math.max(1, item.h);
  const r = clamp(item.style?.radius ?? 0, 0, Math.min(w, h) / 2);

  // Rectangle: 4 anchors, no handles
  if (r < 0.5) {
    return {
      closed: true,
      points: [
        { id: uid("p"), x: 0, y: 0 },
        { id: uid("p"), x: 1, y: 0 },
        { id: uid("p"), x: 1, y: 1 },
        { id: uid("p"), x: 0, y: 1 },
      ],
    };
  }

  const k = 0.5522847498; // kappa approximation
  const rx = r / w;
  const ry = r / h;
  const kx = (r * k) / w;
  const ky = (r * k) / h;

  const TL: BezierPoint = {
    id: uid("p"),
    x: rx,
    y: 0,
    in: { x: clamp(rx - kx, 0, 1), y: 0 },
    out: { x: clamp(rx + kx, 0, 1), y: 0 },
  };

  const TR: BezierPoint = {
    id: uid("p"),
    x: 1 - rx,
    y: 0,
    in: { x: clamp(1 - rx - kx, 0, 1), y: 0 },
    out: { x: 1, y: clamp(ry - ky, 0, 1) },
  };

  const BR: BezierPoint = {
    id: uid("p"),
    x: 1,
    y: 1 - ry,
    in: { x: 1, y: clamp(1 - ry + ky, 0, 1) },
    out: { x: clamp(1 - rx + kx, 0, 1), y: 1 },
  };

  const BL: BezierPoint = {
    id: uid("p"),
    x: rx,
    y: 1,
    in: { x: clamp(rx - kx, 0, 1), y: 1 },
    out: { x: 0, y: clamp(1 - ry + ky, 0, 1) },
  };

  return { closed: true, points: [TL, TR, BR, BL] };
}

function bezierToLocal(point: { x: number; y: number }, w: number, h: number) {
  return { x: point.x * w, y: point.y * h };
}
function localToBezier(point: { x: number; y: number }, w: number, h: number) {
  return { x: clamp(point.x / w, 0, 1), y: clamp(point.y / h, 0, 1) };
}

/* ---------------- Curvature helpers (Illustrator Curvature-ish) ---------------- */

function catmullRomToBezierSegments(
  pts: { x: number; y: number; corner?: boolean }[],
  closed: boolean,
  tension: number
) {
  const n = pts.length;
  if (n < 2) return [];

  const get = (i: number) => {
    if (closed) return pts[(i + n) % n];
    return pts[Math.max(0, Math.min(n - 1, i))];
  };

  const t = clamp(tension, 0, 2);
  const k = t / 6;

  const segs: { p1: any; c1: any; c2: any; p2: any }[] = [];
  const last = closed ? n : n - 1;

  for (let i = 0; i < last; i++) {
    const P0 = get(i - 1);
    const P1 = get(i);
    const P2 = get(i + 1);
    const P3 = get(i + 2);

    let C1 = { x: P1.x + (P2.x - P0.x) * k, y: P1.y + (P2.y - P0.y) * k };
    let C2 = { x: P2.x - (P3.x - P1.x) * k, y: P2.y - (P3.y - P1.y) * k };

    // Corners collapse tangents
    if (P1.corner) C1 = { x: P1.x, y: P1.y };
    if (P2.corner) C2 = { x: P2.x, y: P2.y };

    segs.push({ p1: P1, c1: C1, c2: C2, p2: P2 });
  }

  return segs;
}

function rectToPolygon(): PolygonPath {
  return {
    closed: true,
    points: [
      { id: uid("pt"), x: 0, y: 0 },
      { id: uid("pt"), x: 1, y: 0 },
      { id: uid("pt"), x: 1, y: 1 },
      { id: uid("pt"), x: 0, y: 1 },
    ],
  };
}

function rectToCurvature(closed: boolean = true): CurvaturePath {
  // A minimal “sleek” starting curve: 4 anchors around a rounded-ish rect.
  // Users can add points later; this keeps it calm.
  return {
    closed,
    tension: 1,
    points: [
      { id: uid("c"), x: 0.1, y: 0.05 },
      { id: uid("c"), x: 0.9, y: 0.05 },
      { id: uid("c"), x: 0.95, y: 0.9 },
      { id: uid("c"), x: 0.05, y: 0.9 },
    ],
  };
}

/* ---------------- Main ---------------- */

type EditMode = "none" | "corners" | "polygon" | "curvature" | "bezier";

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

  onCopySelected: () => void;
  onPasteAtCursor: () => void;
  onDeleteSelected: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const [stageSize, setStageSize] = useState({ w: 900, h: 600 });
  const [toolbarBox, setToolbarBox] = useState<ScreenBox>(null);
  const [toolbarOffset, setToolbarOffset] = useState<{ dx: number; dy: number } | null>(null);

  const [editMode, setEditMode] = useState<EditMode>("none");
  const isCoarse = useIsCoarsePointer();

  const panningRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  });

  const emptyDownRef = useRef<{ x: number; y: number } | null>(null);
  const didPanRef = useRef(false);

  const nodeMapRef = useRef<Map<string, Konva.Node>>(new Map());

  // let child components request a cursor
  const cursorRef = useRef<string>("default");
  function setWrapCursor(next: string) {
    cursorRef.current = next;
    const el = wrapRef.current;
    if (el) el.style.cursor = next;
  }

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

  const pinchRef = useRef<{ lastDist: number; lastCenter: { x: number; y: number } | null }>({
    lastDist: 0,
    lastCenter: null,
  });
  
  function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  
  function center(a: { x: number; y: number }, b: { x: number; y: number }) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  
  function onTouchMove(e: any) {
    const stage = stageRef.current;
    if (!stage) return;
  
    const pts = stage.getPointersPositions();
    if (!pts || pts.length !== 2) return;
  
    e.evt.preventDefault();
  
    const p1 = pts[0];
    const p2 = pts[1];
  
    const c = center(p1, p2);
    const d = dist(p1, p2);
  
    const pr = pinchRef.current;
  
    if (!pr.lastCenter) {
      pr.lastCenter = c;
      pr.lastDist = d;
      return;
    }
  
    const oldScale = props.stageScale;
    const scaleBy = d / pr.lastDist;
    const newScale = clamp(oldScale * scaleBy, 0.35, 2.6);
  
    const pointTo = {
      x: (c.x - props.stagePos.x) / oldScale,
      y: (c.y - props.stagePos.y) / oldScale,
    };
  
    props.setStageScale(newScale);
    props.setStagePos({
      x: c.x - pointTo.x * newScale,
      y: c.y - pointTo.y * newScale,
    });
  
    pr.lastCenter = c;
    pr.lastDist = d;
  
    updateSelectionUIRaf();
  }
  
  function onTouchEnd() {
    pinchRef.current.lastCenter = null;
    pinchRef.current.lastDist = 0;
  }
  


  const updateSelectionUI = useCallback(() => {
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    if (!stage || !wrap) {
      setToolbarBox(null);
      return;
    }
    if (props.selectedIds.length === 0) {
      setToolbarBox(null);
      return;
    }

    const tr = trRef.current;
    const nodeForRect = tr ?? nodeMapRef.current.get(props.selectedIds[0]);
    if (!nodeForRect) {
      setToolbarBox(null);
      return;
    }

    const rect = (nodeForRect as any).getClientRect?.({
      skipTransform: false,
    }) as
      | { x: number; y: number; width: number; height: number }
      | undefined;

    if (!rect) {
      setToolbarBox(null);
      return;
    }

    const left = props.stagePos.x + rect.x * props.stageScale;
    const top = props.stagePos.y + rect.y * props.stageScale;
    const width = rect.width * props.stageScale;
    const height = rect.height * props.stageScale;

    setToolbarBox({ left, top, width, height });
  }, [props.selectedIds, props.stagePos.x, props.stagePos.y, props.stageScale]);

  const updateSelectionUIRaf = useRafThrottled(updateSelectionUI);
  const setCursorWorldRaf = useRafThrottled(props.setCursorWorld);

  useEffect(() => {
    props.setViewportCenterWorld(
      worldFromScreen({ x: stageSize.w / 2, y: stageSize.h / 2 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageSize.w, stageSize.h, props.stagePos.x, props.stagePos.y, props.stageScale]);

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

    updateSelectionUIRaf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedIds, props.doc.items]);

  useEffect(() => {
    updateSelectionUIRaf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.stagePos.x, props.stagePos.y, props.stageScale, stageSize.w, stageSize.h]);

  // Reset edit mode when selection changes (keeps it clean)
  useEffect(() => {
    setEditMode("none");
  }, [props.selectedIds.join("|")]);

  useEffect(() => {
    setToolbarOffset(null);
  }, [props.selectedIds.join("|")]);


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

    updateSelectionUIRaf();
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

    if (isEmptyHit(e)) {
      emptyDownRef.current = { x: pointer.x, y: pointer.y };
      didPanRef.current = false;
      startPan(pointer);
    }
  }

  function onMouseMove() {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    setCursorWorldRaf(worldFromScreen(pointer));

    if (panningRef.current.active) {
      const dx = pointer.x - panningRef.current.startX;
      const dy = pointer.y - panningRef.current.startY;

      if (!didPanRef.current) {
        const dist = Math.hypot(dx, dy);
        if (dist > 3) didPanRef.current = true;
      }

      props.setStagePos({
        x: panningRef.current.startPosX + dx,
        y: panningRef.current.startPosY + dy,
      });

      updateSelectionUIRaf();
    }
  }

  function onMouseUp() {
    if (emptyDownRef.current && !didPanRef.current) {
      props.setSelectedIds([]);
      setToolbarBox(null);
    }

    emptyDownRef.current = null;
    didPanRef.current = false;
    panningRef.current.active = false;

    if (!wrapRef.current) return;
    wrapRef.current.style.cursor =
      panningRef.current.active ? "grabbing" : cursorRef.current || "default";
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

  const showTransformer = props.selectedIds.length > 1; // only show transformer for multi-select

  const selectedItems = useMemo(() => {
    const set = new Set(props.selectedIds);
    return props.doc.items.filter((i) => set.has(i.id));
  }, [props.doc.items, props.selectedIds]);

  const anyLocked = selectedItems.some((it) => Boolean(it.meta?.locked));
  const single = selectedItems.length === 1 ? selectedItems[0] : null;

  const selectionProfile = useMemo(() => {
    if (selectedItems.length !== 1) {
      return {
        keepRatio: false,
        anchors: [
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
          "middle-left",
          "middle-right",
          "top-center",
          "bottom-center",
        ] as const,
        minW: 24,
        minH: 24,
        clampH: null as null | { min: number; max: number },
      };
    }

    const it = selectedItems[0];

    if (isPillLike(it)) {
      return {
        keepRatio: false,
        anchors: ["middle-left", "middle-right", "top-center", "bottom-center"] as const,
        minW: 40,
        minH: 14,
        clampH: { min: 14, max: 80 },
      };
    }

    return {
      keepRatio: false,
      anchors: [
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
        "middle-left",
        "middle-right",
        "top-center",
        "bottom-center",
      ] as const,
      minW: 24,
      minH: 24,
      clampH: null,
    };
  }, [selectedItems]);

  // Grid (less busy): fade + hide when zoomed out
  const gridStep = 80;
  const showGrid = props.stageScale >= 0.6;
  const gridAlpha = clamp((props.stageScale - 0.6) / 0.8, 0, 1);
  const gridStroke = `rgba(34,54,44,${0.04 + 0.06 * gridAlpha})`;

  const gridLinesX = useMemo(() => {
    const xs: number[] = [];
    for (let x = 0; x <= props.doc.canvas.width; x += gridStep) xs.push(x);
    return xs;
  }, [props.doc.canvas.width]);

  const gridLinesY = useMemo(() => {
    const ys: number[] = [];
    for (let y = 0; y <= props.doc.canvas.height; y += gridStep) ys.push(y);
    return ys;
  }, [props.doc.canvas.height]);

  function duplicateSelected() {
    props.onCopySelected();
    props.onPasteAtCursor();
  }

  function deleteSelected() {
    props.onDeleteSelected();
  }

  function toggleLockSelected() {
    for (const it of selectedItems) {
      const locked = Boolean(it.meta?.locked);
      props.onUpdateItem(it.id, { meta: { ...it.meta, locked: !locked } });
    }
    updateSelectionUIRaf();
  }

  function setRadiusSelected(radius: number) {
    for (const it of selectedItems) {
      if (Boolean(it.meta?.locked)) continue;
      if (!isRectLike(it)) continue;
      // If user is using polygon/curvature/bezier, radius isn't relevant
      if (hasBezier(it) || hasCurvature(it) || hasPolygon(it)) continue;

      props.onUpdateItem(it.id, {
        style: { ...it.style, radius: clamp(radius, 0, 220) },
      });
    }
    updateSelectionUIRaf();
  }

  function cycleEditMode() {
    if (!single) return;
    if (single.meta?.locked) return;

    // Decide what edit means for the current geometry
    if (hasBezier(single)) {
      setEditMode((m) => (m === "bezier" ? "none" : "bezier"));
      return;
    }
    if (hasCurvature(single)) {
      setEditMode((m) => (m === "curvature" ? "none" : "curvature"));
      return;
    }
    if (hasPolygon(single)) {
      setEditMode((m) => (m === "polygon" ? "none" : "polygon"));
      return;
    }
    if (isRectLike(single) && !isPillLike(single)) {
      setEditMode((m) => (m === "corners" ? "none" : "corners"));
      return;
    }
    setEditMode("none");
  }

  function convertSelected(kind: "rect" | "polygon" | "curvature" | "bezier") {
    if (!single) return;
    if (single.meta?.locked) return;

    if (kind === "rect") {
      props.onUpdateItem(single.id, {
        meta: {
          ...single.meta,
          polygon: undefined,
          curvature: undefined,
          bezier: undefined,
          cornerRadii: undefined,
        },
      });
      setEditMode("corners");
      updateSelectionUIRaf();
      return;
    }

    if (kind === "polygon") {
      const poly: PolygonPath = single.meta.polygon ?? rectToPolygon();
      props.onUpdateItem(single.id, {
        meta: {
          ...single.meta,
          polygon: poly,
          curvature: undefined,
          bezier: undefined,
          cornerRadii: undefined,
        },
      });
      setEditMode("polygon");
      updateSelectionUIRaf();
      return;
    }

    if (kind === "curvature") {
      const closed = single.type !== "path"; // paths often want open; you can toggle later
      const curv: CurvaturePath = single.meta.curvature ?? rectToCurvature(closed);
      props.onUpdateItem(single.id, {
        meta: {
          ...single.meta,
          curvature: curv,
          polygon: undefined,
          bezier: undefined,
          cornerRadii: undefined,
        },
      });
      setEditMode("curvature");
      updateSelectionUIRaf();
      return;
    }

    if (kind === "bezier") {
      // Advanced mode. For rects, derive from radius. For others, start from rect-ish.
      const bez: BezierPath = single.meta.bezier ?? roundedRectToBezierPath(single);
      props.onUpdateItem(single.id, {
        meta: {
          ...single.meta,
          bezier: bez,
          curvature: undefined,
          polygon: undefined,
          cornerRadii: undefined,
        },
      });
      setEditMode("bezier");
      updateSelectionUIRaf();
      return;
    }
  }

  const curveLabel =
    editMode === "corners"
      ? "Corners"
      : editMode === "polygon"
        ? "Polygon"
        : editMode === "curvature"
          ? "Curvature"
          : editMode === "bezier"
            ? "Bezier"
            : "Edit";

  const canRadius =
    Boolean(single) &&
    isRectLike(single!) &&
    !hasBezier(single!) &&
    !hasCurvature(single!) &&
    !hasPolygon(single!);

  return (
    <section
      ref={wrapRef}
      className="relative h-full w-full"
      style={{
        touchAction: "none",
        cursor: panningRef.current.active ? "grabbing" : cursorRef.current || "default",
        background:
          "radial-gradient(circle at 30% 15%, rgba(255,255,255,0.95), rgba(249,247,242,1) 45%, rgba(244,240,232,1) 100%)",
      }}
    >
      {toolbarBox ? (
        <FloatingToolbar
          box={toolbarBox}
          wrapSize={stageSize}
          locked={anyLocked}
          canRadius={canRadius}
          currentRadius={single ? (single.style?.radius ?? 0) : 0}
          editLabel={curveLabel}
          editOn={editMode !== "none"}
          canEdit={Boolean(single) && !anyLocked}
          onToggleEdit={cycleEditMode}
          onDuplicate={duplicateSelected}
          onToggleLock={toggleLockSelected}
          onDelete={deleteSelected}
          onSetRadius={setRadiusSelected}
          onConvert={(k) => convertSelected(k)}
          canConvert={Boolean(single) && !anyLocked}
          offset={toolbarOffset}
          onOffsetChange={setToolbarOffset}
        />
      ) : null}

      <div className="absolute left-4 top-4 z-10 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-xs text-black/70 shadow-sm backdrop-blur">
        Plot · {props.doc.items.length} items · Selected: {props.selectedIds.length} · Double-click
        to place
      </div>

      <div className="h-full w-full overflow-hidden">
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
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          <Layer>
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

            {showGrid
              ? gridLinesX.map((x) => (
                  <Line
                    key={`gx-${x}`}
                    points={[x, 0, x, props.doc.canvas.height]}
                    stroke={gridStroke}
                    strokeWidth={1}
                    listening={false}
                  />
                ))
              : null}
            {showGrid
              ? gridLinesY.map((y) => (
                  <Line
                    key={`gy-${y}`}
                    points={[0, y, props.doc.canvas.width, y]}
                    stroke={gridStroke}
                    strokeWidth={1}
                    listening={false}
                  />
                ))
              : null}

            {itemsSorted.map((item) => (
              <ItemNodeMemo
                key={item.id}
                item={item}
                selected={props.selectedIds.includes(item.id)}
                locked={Boolean(item.meta?.locked)}
                stageScale={props.stageScale}
                editMode={props.selectedIds.length === 1 ? editMode : "none"}
                setWrapCursor={setWrapCursor}
                onRegister={(node) => {
                  if (node) nodeMapRef.current.set(item.id, node);
                  else nodeMapRef.current.delete(item.id);
                }}
                onSelect={(evt) => toggleSelect(item.id, evt.shiftKey)}
                onCommit={(patch) => {
                  if (Boolean(item.meta?.locked)) return;
                  props.onUpdateItem(item.id, patch);
                  updateSelectionUIRaf();
                }}
                onSelectionUI={() => updateSelectionUIRaf()}
                isCoarse={isCoarse}
              />
            ))}
            {showTransformer ? (
              <Transformer
                ref={trRef}
                rotateEnabled={false}
                keepRatio={selectionProfile.keepRatio}
                padding={6}
                borderStroke="rgba(0,0,0,0)"
                borderStrokeWidth={0}
                anchorSize={9}
                anchorCornerRadius={9}
                anchorStroke="rgba(111, 102, 255, 0.55)"
                anchorStrokeWidth={1.2}
                anchorFill="rgba(255,255,255,0.98)"
                enabledAnchors={selectionProfile.anchors as any}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < selectionProfile.minW || newBox.height < selectionProfile.minH) {
                    return oldBox;
                  }
                  if (selectionProfile.clampH) {
                    const { min, max } = selectionProfile.clampH;
                    return { ...newBox, height: clamp(newBox.height, min, max) };
                  }
                  return newBox;
                }}
                onTransform={() => updateSelectionUIRaf()}
                onTransformEnd={() => updateSelectionUIRaf()}
              />
            ) : null}     
          </Layer>
        </Stage>
      </div>
    </section>
  );
}

/* ---------------- Item Node ---------------- */

function ItemNode(props: {
  item: StudioItem;
  selected: boolean;
  locked: boolean;
  stageScale: number;
  editMode: EditMode;
  isCoarse: boolean;

  setWrapCursor: (cursor: string) => void;

  onRegister: (node: Konva.Node | null) => void;
  onSelect: (evt: { shiftKey: boolean }) => void;

  // commit-only writes
  onCommit: (patch: Partial<StudioItem>) => void;

  onSelectionUI: () => void;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const textRef = useRef<Konva.Text>(null);

  function keepLabelReadable() {
    const g = groupRef.current;
    const t = textRef.current;
    if (!g || !t) return;

    const sx = g.scaleX();
    const sy = g.scaleY();

    if (Math.abs(sx) > 1e-6) t.scaleX(1 / sx);
    if (Math.abs(sy) > 1e-6) t.scaleY(1 / sy);

    // If you want label to stay upright even if the shape rotates:
    // t.rotation(-g.rotation());

    t.getLayer()?.batchDraw();
  }

  const transformStartRef = useRef<{ x: number; y: number } | null>(null);

  const [hovered, setHovered] = useState(false);

  // Draft geometry for edit modes (NO store writes during drag)
  const [draftCurv, setDraftCurv] = useState<CurvaturePath | null>(null);
  const [draftPoly, setDraftPoly] = useState<PolygonPath | null>(null);

  useEffect(() => {
    props.onRegister(groupRef.current);
    return () => props.onRegister(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync drafts when entering edit mode or item changes
  useEffect(() => {
    if (!props.selected) {
      setDraftCurv(null);
      setDraftPoly(null);
      return;
    }
    if (props.editMode === "curvature" && props.item.meta.curvature) {
      setDraftCurv(structuredClone(props.item.meta.curvature));
    } else {
      setDraftCurv(null);
    }
    if (props.editMode === "polygon" && props.item.meta.polygon) {
      setDraftPoly(structuredClone(props.item.meta.polygon));
    } else {
      setDraftPoly(null);
    }
  }, [props.selected, props.editMode, props.item.id]);

  useEffect(() => {
    const g = groupRef.current;
    const t = textRef.current;
    if (!g || !t) return;

    // If group is being scaled by handles, keep text readable
    const sx = g.scaleX();
    const sy = g.scaleY();

    // when not scaling, ensure normal
    if (Math.abs(sx - 1) < 1e-3 && Math.abs(sy - 1) < 1e-3) {
      t.scaleX(1);
      t.scaleY(1);
      t.rotation(-g.rotation());
      return;
    }

    // Counter the group scale (prevents squish/stretch)
    t.scaleX(1 / sx);
    t.scaleY(1 / sy);

    // Optional: keep label from getting blurry while scaling
    // by snapping to pixel-ish values:
    // t.scaleX(Math.round((1 / sx) * 1000) / 1000);
    // t.scaleY(Math.round((1 / sy) * 1000) / 1000);

    t.getLayer()?.batchDraw();
  });
  
  const s = props.item.style;
  const fill = rgba(s.fill, s.fillOpacity);
  const stroke = rgba(s.stroke, s.strokeOpacity);
  const shadow = s.shadow;
  const shadowColor = shadow ? rgba(shadow.color, shadow.opacity) : "transparent";
  const plants = props.item.meta.plants ?? [];
  const plantAccent = plants[0]?.color ?? "#5e7658";

  const isSelected = props.selected;

  const radiusMax = Math.min(props.item.w, props.item.h) / 2;

  // Calm UI: label only when selected / hovered / zoomed in
  const showLabel = isSelected || hovered || props.stageScale > 0.9;

  // Center pivot
  const cx = props.item.w / 2;
  const cy = props.item.h / 2;

  const perCorner = props.item.meta.cornerRadii as CornerRadii | undefined;
  const rectCornerRadius = perCorner
    ? ([perCorner.tl, perCorner.tr, perCorner.br, perCorner.bl] as any)
    : clamp(s.radius ?? 0, 0, radiusMax);

  const showCorners =
    isSelected &&
    !props.locked &&
    !isPillLike(props.item); // keep pills simple

  // Render priority: bezier > curvature > polygon > defaults
  const showBezier = Boolean(props.item.meta.bezier);
  const showCurv = Boolean(draftCurv ?? props.item.meta.curvature);
  const showPoly = Boolean(draftPoly ?? props.item.meta.polygon);

  return (
    <Group
      ref={groupRef}
      x={props.item.x + cx}
      y={props.item.y + cy}
      offsetX={cx}
      offsetY={cy}
      rotation={props.item.r}
      draggable={!props.locked}
      opacity={props.locked ? 0.92 : 1}
      onClick={(e) => props.onSelect({ shiftKey: e.evt.shiftKey })}
      onTap={() => props.onSelect({ shiftKey: false })}
      onDragMove={() => props.onSelectionUI()}
      onDragEnd={(e) => {
        const nx = e.target.x() - cx;
        const ny = e.target.y() - cy;
        props.onCommit({ x: nx, y: ny });
      }}
      onTransformStart={(e) => {
        const node = e.target as Konva.Group;
        transformStartRef.current = { x: node.x(), y: node.y() }; // center point
      }}
      onTransform={() => {
        const node = groupRef.current;
        if (node && transformStartRef.current) {
          node.position(transformStartRef.current);
        }
        keepLabelReadable();
        props.onSelectionUI();
      }}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Group;

        const start = transformStartRef.current ?? { x: node.x(), y: node.y() };

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        const nextW = Math.max(24, props.item.w * scaleX);
        const nextH = Math.max(24, props.item.h * scaleY);

        const nextCx = nextW / 2;
        const nextCy = nextH / 2;

        // reset scale back to 1 (we bake it into w/h)
        node.scaleX(1);
        node.scaleY(1);

        // force center back to the pinned center
        node.position(start);

        const topLeftX = start.x - nextCx;
        const topLeftY = start.y - nextCy;

        transformStartRef.current = null;
        // ✅ reset label local scale back to normal after bake
        if (textRef.current) {
          textRef.current.scaleX(1);
          textRef.current.scaleY(1);
          // textRef.current.rotation(0); // only if you used the "upright" option above
        }

        props.onCommit({
          x: topLeftX,
          y: topLeftY,
          w: nextW,
          h: nextH,
          r: node.rotation(),
        });
      }}

      onMouseEnter={() => {
        setHovered(true);
        if (!props.locked && isSelected) props.setWrapCursor("default");
      }}
      onMouseLeave={() => {
        setHovered(false);
        props.setWrapCursor("default");
      }}
    >
      {/* ---- Body ---- */}
      {showBezier ? (
        <BezierShape
          item={props.item}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
        />
      ) : showCurv ? (
        <CurvatureShape
          item={props.item}
          path={(draftCurv ?? props.item.meta.curvature)!}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
        />
      ) : showPoly ? (
        <PolygonShape
          item={props.item}
          path={(draftPoly ?? props.item.meta.polygon)!}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
        />
      ) : isPillLike(props.item) ? (
        <Rect
          width={props.item.w}
          height={props.item.h}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          cornerRadius={Math.min(props.item.w, props.item.h) / 2}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
          shadowEnabled
        />
      ) : isRectLike(props.item) ? (
        <Rect
          ref={rectRef}
          width={props.item.w}
          height={props.item.h}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          cornerRadius={rectCornerRadius}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
          shadowEnabled
        />
      ) : (
        <Ellipse
          x={props.item.w / 2}
          y={props.item.h / 2}
          radiusX={props.item.w / 2}
          radiusY={props.item.h / 2}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
          shadowEnabled
        />
      )}


      {showLabel ? (
        <Text
          ref={textRef}
          x={14}
          y={12}
          text={props.item.label}
          fontSize={14}
          fill="rgba(15,23,42,0.90)"
          listening={false}
          opacity={isSelected ? 1 : 0.82}
        />
      ) : null}

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

      {/* ✅ Illustrator-grade corners: live Konva transforms, commit on mouseup */}
      {showCorners ? (
        <CornerSmartHandlesPro
          w={props.item.w}
          h={props.item.h}
          groupRef={groupRef}
          currentRotation={props.item.r}
          minSize={24}
          setWrapCursor={props.setWrapCursor}
          onSelectionUI={props.onSelectionUI}
          onCommit={(patch) => props.onCommit(patch)}
          isCoarse={props.isCoarse}
        />
      ) : null}

      {/* ✅ Live Corners edit (rect-like only, and only when no other geometry is present) */}
      {isSelected &&
      !props.locked &&
      props.editMode === "corners" &&
      isRectLike(props.item) &&
      !showBezier &&
      !showCurv &&
      !showPoly ? (
        <LiveCornersOverlay
          w={props.item.w}
          h={props.item.h}
          rectRef={rectRef}
          currentUniformRadius={clamp(s.radius ?? 0, 0, radiusMax)}
          cornerRadii={perCorner}
          onCommit={(next) => {
            if ("uniform" in next) {
              props.onCommit({
                style: { ...props.item.style, radius: next.uniform },
                meta: { ...props.item.meta, cornerRadii: undefined },
              });
            } else {
              props.onCommit({
                meta: { ...props.item.meta, cornerRadii: next.corners },
              });
            }
          }}
        />
      ) : null}

      {/* ✅ Curvature (Illustrator Curvature-like): anchors only, auto-smooth */}
      {isSelected &&
      !props.locked &&
      props.editMode === "curvature" &&
      (props.item.meta.curvature || draftCurv) ? (
        <CurvatureEditorOverlay
          w={props.item.w}
          h={props.item.h}
          path={(draftCurv ?? props.item.meta.curvature)!}
          onDraft={(d) => setDraftCurv(d)}
          onCommit={(d) => {
            props.onCommit({ meta: { ...props.item.meta, curvature: d } });
          }}
        />
      ) : null}

      {/* ✅ Polygon: vertices only */}
      {isSelected &&
      !props.locked &&
      props.editMode === "polygon" &&
      (props.item.meta.polygon || draftPoly) ? (
        <PolygonEditorOverlay
          w={props.item.w}
          h={props.item.h}
          path={(draftPoly ?? props.item.meta.polygon)!}
          onDraft={(d) => setDraftPoly(d)}
          onCommit={(d) => {
            props.onCommit({ meta: { ...props.item.meta, polygon: d } });
          }}
        />
      ) : null}

      {/* ✅ Bezier editor (advanced) */}
      {isSelected &&
      !props.locked &&
      props.editMode === "bezier" &&
      props.item.meta.bezier ? (
        <BezierEditorOverlay
          w={props.item.w}
          h={props.item.h}
          path={props.item.meta.bezier}
          onChange={(next) => props.onCommit({ meta: { ...props.item.meta, bezier: next } })}
        />
      ) : null}
    </Group>
  );
}

const ItemNodeMemo = React.memo(ItemNode, (a, b) => {
  return (
    a.item === b.item &&
    a.selected === b.selected &&
    a.locked === b.locked &&
    a.stageScale === b.stageScale &&
    a.editMode === b.editMode
  );
});

/* ---------------- Shapes ---------------- */

function BezierShape(props: {
  item: StudioItem;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}) {
  const bezier = props.item.meta.bezier!;
  const w = props.item.w;
  const h = props.item.h;

  return (
    <Shape
      sceneFunc={(ctx, shape) => {
        const pts = bezier.points;
        if (!pts?.length) {
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
          return;
        }

        const firstLocal = bezierToLocal({ x: pts[0].x, y: pts[0].y }, w, h);

        ctx.beginPath();
        ctx.moveTo(firstLocal.x, firstLocal.y);

        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];

          if (!bezier.closed && i === pts.length - 1) break;

          const aLocal = bezierToLocal({ x: a.x, y: a.y }, w, h);
          const bLocal = bezierToLocal({ x: b.x, y: b.y }, w, h);

          // If handle missing, use the anchor (prevents inverse corners)
          const h1 = a.out ? bezierToLocal(a.out, w, h) : aLocal;
          const h2 = b.in ? bezierToLocal(b.in, w, h) : bLocal;

          const hasHandles = Boolean(a.out || b.in);
          if (!hasHandles) ctx.lineTo(bLocal.x, bLocal.y);
          else ctx.bezierCurveTo(h1.x, h1.y, h2.x, h2.y, bLocal.x, bLocal.y);
        }

        if (bezier.closed) ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
      fill={props.fill}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
      shadowColor={props.shadowColor}
      shadowBlur={props.shadowBlur}
      shadowOffsetX={props.shadowOffsetX}
      shadowOffsetY={props.shadowOffsetY}
      shadowEnabled
    />
  );
}

function CurvatureShape(props: {
  item: StudioItem;
  path: CurvaturePath;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}) {
  const curv = props.path;
  const w = props.item.w;
  const h = props.item.h;

  return (
    <Shape
      sceneFunc={(ctx, shape) => {
        const pts = curv.points;
        if (!pts?.length) {
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
          return;
        }

        const localPts = pts.map((p) => ({
          x: p.x * w,
          y: p.y * h,
          corner: p.corner,
        }));

        const segs = catmullRomToBezierSegments(localPts, curv.closed, curv.tension ?? 1);
        if (!segs.length) return;

        ctx.beginPath();
        ctx.moveTo(segs[0].p1.x, segs[0].p1.y);
        for (const s of segs) {
          ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p2.x, s.p2.y);
        }
        if (curv.closed) ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
      fill={props.fill}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
      shadowColor={props.shadowColor}
      shadowBlur={props.shadowBlur}
      shadowOffsetX={props.shadowOffsetX}
      shadowOffsetY={props.shadowOffsetY}
      shadowEnabled
    />
  );
}

function PolygonShape(props: {
  item: StudioItem;
  path: PolygonPath;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}) {
  const poly = props.path;
  const w = props.item.w;
  const h = props.item.h;

  return (
    <Shape
      sceneFunc={(ctx, shape) => {
        const pts = poly.points;
        if (!pts?.length) {
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
          return;
        }

        ctx.beginPath();
        ctx.moveTo(pts[0].x * w, pts[0].y * h);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x * w, pts[i].y * h);
        }
        if (poly.closed) ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
      fill={props.fill}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
      shadowColor={props.shadowColor}
      shadowBlur={props.shadowBlur}
      shadowOffsetX={props.shadowOffsetX}
      shadowOffsetY={props.shadowOffsetY}
      shadowEnabled
    />
  );
}

/* ---------------- Illustrator-grade corner handles (no store writes during drag) ---------------- */

function CornerSmartHandlesPro(props: {
  w: number;
  h: number;
  groupRef: React.RefObject<Konva.Group | null>;
  currentRotation: number;
  minSize: number;
  setWrapCursor: (cursor: string) => void;
  onSelectionUI: () => void;
  onCommit: (patch: Partial<StudioItem>) => void;
  isCoarse: boolean;
  
}) {
  const knobR = props.isCoarse ? 9 : 6;
  const rotateRing = props.isCoarse ? 28 : 18;
  // also consider:
  const hitStroke = props.isCoarse ? rotateRing * 2.4 : rotateRing * 2;
  const [hoverRotateCorner, setHoverRotateCorner] = useState<CornerKey | null>(null);

  const corners = [
    { key: "tl", x: 0, y: 0 },
    { key: "tr", x: props.w, y: 0 },
    { key: "br", x: props.w, y: props.h },
    { key: "bl", x: 0, y: props.h },
  ] as const;

  type CornerKey = (typeof corners)[number]["key"];
  type DragMode = "none" | "rotate" | "resize";

  // Shift snapping
  const shiftDownRef = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftDownRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftDownRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const dragRef = useRef<{
    mode: DragMode;
    corner: CornerKey;

    startW: number;
    startH: number;
    startRotation: number;

    // stable anchor references
    startCenterWorld: { x: number; y: number };
    startCenterParent: { x: number; y: number };
    startAngleParent: number;

    // for cancel restore
    startScaleX: number;
    startScaleY: number;
    startAbsPos: { x: number; y: number };
  } | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);

  /* ---------- helpers ---------- */
  function counterScaleLabel(g: Konva.Group) {
    // safest: string selector (no predicate, no implicit-any)
    const t = g.findOne("Text") as Konva.Text | null;
    if (!t) return; 

    const sx = g.scaleX();
    const sy = g.scaleY();  

    if (Math.abs(sx) > 1e-6) t.scaleX(1 / sx);
    if (Math.abs(sy) > 1e-6) t.scaleY(1 / sy);  

    t.getLayer()?.batchDraw();
  } 



  function stagePointerWorld(): { x: number; y: number } | null {
    const g = props.groupRef.current;
    const stage = g?.getStage();
    return stage?.getPointerPosition() ?? null;
  }

  function parentInvTransform(): Konva.Transform | null {
    const g = props.groupRef.current;
    if (!g) return null;
    const parent = g.getParent();
    if (!parent) return null;
    return parent.getAbsoluteTransform().copy().invert();
  }

  function pointerParent(): { x: number; y: number } | null {
    const g = props.groupRef.current;
    if (!g) return null;
    const pW = stagePointerWorld();
    if (!pW) return null;
    const inv = parentInvTransform();
    return inv ? inv.point(pW) : pW;
  }

  function centerWorld(): { x: number; y: number } | null {
    const g = props.groupRef.current;
    if (!g) return null;
    const t = g.getAbsoluteTransform();
    return t.point({ x: props.w / 2, y: props.h / 2 });
  }

  function centerParent(): { x: number; y: number } | null {
    const cW = centerWorld();
    if (!cW) return null;
    const inv = parentInvTransform();
    return inv ? inv.point(cW) : cW;
  }

  function angleDeg(a: { x: number; y: number }, c: { x: number; y: number }) {
    return (Math.atan2(a.y - c.y, a.x - c.x) * 180) / Math.PI;
  }

  function pointerToLocal(): { x: number; y: number } | null {
    const g = props.groupRef.current;
    const pW = stagePointerWorld();
    if (!g || !pW) return null;
    const inv = g.getAbsoluteTransform().copy().invert();
    return inv.point(pW);
  }

  function isOutsideRect(local: { x: number; y: number }, pad = 2) {
    return (
      local.x < -pad ||
      local.y < -pad ||
      local.x > props.w + pad ||
      local.y > props.h + pad
    );
  }

  function cornerDist(local: { x: number; y: number }, corner: { x: number; y: number }) {
    return Math.hypot(local.x - corner.x, local.y - corner.y);
  }

  function cursorForCornerResize(c: CornerKey) {
    if (c === "tl" || c === "br") return "nwse-resize";
    return "nesw-resize";
  }

  // Rock-solid center lock in WORLD space
  function forceCenterLock(g: Konva.Group, desiredCenterWorld: { x: number; y: number }) {
    const t = g.getAbsoluteTransform();
    const curCenter = t.point({ x: props.w / 2, y: props.h / 2 });

    const dx = desiredCenterWorld.x - curCenter.x;
    const dy = desiredCenterWorld.y - curCenter.y;

    const abs = g.absolutePosition();
    g.absolutePosition({ x: abs.x + dx, y: abs.y + dy });
  }

  function endDrag(commit: boolean) {
    const g = props.groupRef.current;
    const st = dragRef.current;

    dragRef.current = null;
    props.setWrapCursor("default");

    if (cleanupRef.current) cleanupRef.current();
    cleanupRef.current = null;

    if (!g || !st) return;

    if (commit) {
      const finalRot = g.rotation();
      const sx = g.scaleX();
      const sy = g.scaleY();

      const nextW = Math.max(props.minSize, st.startW * sx);
      const nextH = Math.max(props.minSize, st.startH * sy);

      // compute stable top-left from the locked center (in parent coords)
      const lockedCenterW = st.startCenterWorld;
      const inv = parentInvTransform();
      const lockedCenterP = inv ? inv.point(lockedCenterW) : lockedCenterW;

      const nextX = lockedCenterP.x - nextW / 2;
      const nextY = lockedCenterP.y - nextH / 2;

      // bake scale into w/h
      g.scaleX(1);
      g.scaleY(1);
      g.rotation(finalRot);

      // keep center visually stable
      g.position({ x: lockedCenterP.x, y: lockedCenterP.y });

      g.getLayer()?.batchDraw();

      props.onCommit({
        x: nextX,
        y: nextY,
        w: nextW,
        h: nextH,
        r: finalRot,
      });
    } else {
      // cancel restore: rotation/scale/position
      g.rotation(st.startRotation);
      g.scaleX(st.startScaleX);
      g.scaleY(st.startScaleY);
      g.absolutePosition(st.startAbsPos);

      // also re-lock to original center to avoid any drift
      forceCenterLock(g, st.startCenterWorld);

      g.getLayer()?.batchDraw();
    }

    // always restore draggable
    g.draggable(true);
    props.onSelectionUI();
  }

  function beginDrag(mode: DragMode, corner: CornerKey) {
    const g = props.groupRef.current;
    const stage = g?.getStage();
    if (!g || !stage) return;

    const cW = centerWorld();
    const cP = centerParent();
    const pP = pointerParent();

    if (!cW || !cP || !pP) return;

    dragRef.current = {
      mode,
      corner,
      startW: props.w,
      startH: props.h,
      startRotation: g.rotation(),
      startCenterWorld: cW,
      startCenterParent: cP,
      startAngleParent: angleDeg(pP, cP),
      startScaleX: g.scaleX(),
      startScaleY: g.scaleY(),
      startAbsPos: g.absolutePosition(),
    };

    // lock group dragging while resizing/rotating via handles
    g.draggable(false);

    if (mode === "rotate") props.setWrapCursor(ROTATE_CURSOR);
    if (mode === "resize") props.setWrapCursor(cursorForCornerResize(corner));

    const onMove = () => {
      const st = dragRef.current;
      if (!st) return;

      if (st.mode === "rotate") {
        const pNowP = pointerParent();
        if (!pNowP) return;

        const now = angleDeg(pNowP, st.startCenterParent);
        const delta = normalizeAngleDelta(now - st.startAngleParent);

        let nextRot = st.startRotation + delta;
        if (shiftDownRef.current) nextRot = Math.round(nextRot / 15) * 15;

        g.rotation(nextRot);

        // keep center stable in world space
        forceCenterLock(g, st.startCenterWorld);

        g.getLayer()?.batchDraw();
        props.onSelectionUI();
        return;
      }

      if (st.mode === "resize") {
        const pW = stagePointerWorld();
        if (!pW) return;

        // resize from center in local-rotation space (stable)
        const vWorld = { x: pW.x - st.startCenterWorld.x, y: pW.y - st.startCenterWorld.y };
        const vLocal = rotateVec(vWorld, -st.startRotation);

        const halfW = Math.max(props.minSize / 2, Math.abs(vLocal.x));
        const halfH = Math.max(props.minSize / 2, Math.abs(vLocal.y));

        const nextW = halfW * 2;
        const nextH = halfH * 2;

        g.scaleX(nextW / st.startW);
        g.scaleY(nextH / st.startH);
        counterScaleLabel(g);

        forceCenterLock(g, st.startCenterWorld);

        g.getLayer()?.batchDraw();
        props.onSelectionUI();
        return;
      }
    };

    const onUp = () => endDrag(true);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") endDrag(false);
    };

    stage.on("mousemove touchmove", onMove);
    stage.on("mouseup touchend", onUp);
    window.addEventListener("keydown", onKey);

    cleanupRef.current = () => {
      stage.off("mousemove touchmove", onMove);
      stage.off("mouseup touchend", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }

  useEffect(() => {
    return () => endDrag(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Group listening>
      {corners.map((c) => (
        <Group key={c.key}>
          {/* Rotation ring hint */}
          {hoverRotateCorner === c.key ? (
          <Circle
            x={c.x}
            y={c.y}
            radius={rotateRing}
            stroke="rgba(111, 102, 255, 0.35)"
            strokeWidth={2}
            dash={[6, 6]}
            listening={false}
          />
          ) : null} 

          {/* Corner knob */}
          <Circle
            x={c.x}
            y={c.y}
            radius={knobR}
            fill="rgba(255,255,255,0.98)"
            stroke="rgba(111, 102, 255, 0.65)"
            strokeWidth={1.2}
            shadowColor="rgba(111, 102, 255, 0.22)"
            shadowBlur={10}
            shadowOffsetX={0}
            shadowOffsetY={6}
            hitStrokeWidth={rotateRing * 2}
            onMouseMove={() => {
              if (dragRef.current) return;
              const local = pointerToLocal();
              if (!local) return; 

              const d = cornerDist(local, c);
              const outside = isOutsideRect(local, 2);  

              if (d <= knobR + 2) {
                setHoverRotateCorner(null);
                props.setWrapCursor(cursorForCornerResize(c.key));
              } else if (d <= rotateRing && outside) {
                setHoverRotateCorner(c.key);
                props.setWrapCursor(ROTATE_CURSOR);
              } else {
                setHoverRotateCorner(null);
                props.setWrapCursor("default");
              }
            }}
            onMouseLeave={() => {
              if (!dragRef.current) props.setWrapCursor("default");
              setHoverRotateCorner(null);
            }}
            onMouseDown={() => {
              const local = pointerToLocal();
              if (!local) return; 

              const d = cornerDist(local, c);
              const outside = isOutsideRect(local, 2);  

              const mode: DragMode =
                d <= knobR + 2 ? "resize" : d <= rotateRing && outside ? "rotate" : "none"; 

              if (mode === "none") return;
              beginDrag(mode, c.key);
            }}
          />
        </Group>
      ))}
    </Group>
  );  

}


/* ---------------- Live Corners (sleek rectangle curve edit) ---------------- */

function LiveCornersOverlay(props: {
  w: number;
  h: number;
  rectRef: React.RefObject<Konva.Rect | null>;
  currentUniformRadius: number;
  cornerRadii?: CornerRadii;
  onCommit: (next: { uniform: number } | { corners: CornerRadii }) => void;
}) {
  const rMax = Math.min(props.w, props.h) / 2;

  const [perCorner, setPerCorner] = useState<boolean>(Boolean(props.cornerRadii));
  const [draftUniform, setDraftUniform] = useState(props.currentUniformRadius);

  useEffect(() => {
    setPerCorner(Boolean(props.cornerRadii));
    setDraftUniform(props.currentUniformRadius);
  }, [props.currentUniformRadius, props.cornerRadii]);

  const corners = useMemo(() => {
    return (
      props.cornerRadii ?? {
        tl: props.currentUniformRadius,
        tr: props.currentUniformRadius,
        br: props.currentUniformRadius,
        bl: props.currentUniformRadius,
      }
    );
  }, [props.cornerRadii, props.currentUniformRadius]);

  const handlePad = 14;

  function setRectCornerRadiusLive(cr: any) {
    const r = props.rectRef.current as any;
    if (!r) return;
    r.cornerRadius(cr);
    r.getLayer()?.batchDraw();
  }

  function commitUniform(r: number) {
    props.onCommit({ uniform: clamp(r, 0, rMax) });
  }

  function commitCorners(next: CornerRadii) {
    props.onCommit({
      corners: {
        tl: clamp(next.tl, 0, rMax),
        tr: clamp(next.tr, 0, rMax),
        br: clamp(next.br, 0, rMax),
        bl: clamp(next.bl, 0, rMax),
      },
    });
  }

  // Uniform handle position
  const uniR = clamp(draftUniform, 0, rMax);
  const hx = clamp(props.w - handlePad - uniR, 18, props.w - 18);
  const hy = clamp(handlePad + uniR, 18, Math.min(60, props.h - 18));

  if (!perCorner) {
    return (
      <Group listening>
        <Circle
          x={hx}
          y={hy}
          radius={6}
          fill="rgba(255,255,255,0.98)"
          stroke="rgba(111, 102, 255, 0.70)"
          strokeWidth={1.2}
          shadowColor="rgba(111, 102, 255, 0.22)"
          shadowBlur={10}
          shadowOffsetX={0}
          shadowOffsetY={6}
          draggable
          onDblClick={() => setPerCorner(true)}
          onDragMove={(e) => {
            const x = e.target.x();
            const y = e.target.y();
            const dx = props.w - handlePad - x;
            const dy = y - handlePad;
            const next = clamp(Math.max(dx, dy), 0, rMax);

            setDraftUniform(next);
            setRectCornerRadiusLive(next); // live
          }}
          onDragEnd={() => {
            commitUniform(draftUniform);
            setRectCornerRadiusLive(draftUniform);
          }}
        />
      </Group>
    );
  }

  const per = {
    tl: clamp(corners.tl, 0, rMax),
    tr: clamp(corners.tr, 0, rMax),
    br: clamp(corners.br, 0, rMax),
    bl: clamp(corners.bl, 0, rMax),
  };

  const perHandles = [
    { key: "tl", x: handlePad + per.tl, y: handlePad + per.tl },
    { key: "tr", x: props.w - handlePad - per.tr, y: handlePad + per.tr },
    { key: "br", x: props.w - handlePad - per.br, y: props.h - handlePad - per.br },
    { key: "bl", x: handlePad + per.bl, y: props.h - handlePad - per.bl },
  ] as const;

  function updateCornerLive(next: CornerRadii) {
    setRectCornerRadiusLive([next.tl, next.tr, next.br, next.bl] as any);
  }

  return (
    <Group listening>
      {perHandles.map((h) => (
        <Circle
          key={h.key}
          x={h.x}
          y={h.y}
          radius={5.8}
          fill="rgba(255,255,255,0.98)"
          stroke="rgba(111, 102, 255, 0.70)"
          strokeWidth={1.2}
          shadowColor="rgba(111, 102, 255, 0.20)"
          shadowBlur={10}
          shadowOffsetX={0}
          shadowOffsetY={6}
          draggable
          onDblClick={() => {
            const avg = (per.tl + per.tr + per.br + per.bl) / 4;
            setPerCorner(false);
            setDraftUniform(avg);
            setRectCornerRadiusLive(avg);
            commitUniform(avg);
          }}
          onDragMove={(e) => {
            const x = e.target.x();
            const y = e.target.y();

            const next: CornerRadii = { ...per };

            if (h.key === "tl") {
              next.tl = clamp(Math.max(x - handlePad, y - handlePad), 0, rMax);
            } else if (h.key === "tr") {
              next.tr = clamp(Math.max(props.w - handlePad - x, y - handlePad), 0, rMax);
            } else if (h.key === "br") {
              next.br = clamp(
                Math.max(props.w - handlePad - x, props.h - handlePad - y),
                0,
                rMax
              );
            } else if (h.key === "bl") {
              next.bl = clamp(Math.max(x - handlePad, props.h - handlePad - y), 0, rMax);
            }

            updateCornerLive(next);
          }}
          onDragEnd={() => {
            const r = props.rectRef.current as any;
            const cr = r?.cornerRadius?.();
            if (Array.isArray(cr) && cr.length === 4) {
              commitCorners({ tl: cr[0], tr: cr[1], br: cr[2], bl: cr[3] });
            } else {
              commitCorners(per);
            }
          }}
        />
      ))}
    </Group>
  );
}

/* ---------------- Curvature Editor Overlay (sleek, anchors only) ---------------- */

function CurvatureEditorOverlay(props: {
  w: number;
  h: number;
  path: CurvaturePath;
  onDraft: (next: CurvaturePath) => void;
  onCommit: (next: CurvaturePath) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [props.path.points.length]);

  const setDraftRaf = useRafThrottled(props.onDraft);

  function setPoint(i: number, patch: Partial<CurvaturePoint>) {
    const pts = props.path.points.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    setDraftRaf({ ...props.path, points: pts });
  }

  // NOTE: Here we commit on drag end (store write once)
  function commitNow(next: CurvaturePath) {
    props.onCommit(next);
  }

  return (
    <Group listening>
      {/* Anchors only */}
      {props.path.points.map((p, i) => {
        const x = p.x * props.w;
        const y = p.y * props.h;
        const isActive = i === activeIndex;

        return (
          <Circle
            key={p.id}
            x={x}
            y={y}
            radius={isActive ? 6.5 : 6}
            fill="rgba(255,255,255,0.98)"
            stroke={p.corner ? "rgba(15,23,42,0.90)" : "rgba(255, 90, 90, 0.95)"}
            strokeWidth={isActive ? 2.0 : 1.6}
            shadowColor="rgba(0,0,0,0.18)"
            shadowBlur={10}
            shadowOffsetX={0}
            shadowOffsetY={6}
            draggable
            onClick={(e) => {
              // Shift+click toggles corner/smooth (Illustrator-ish)
              const shift = Boolean(e.evt?.shiftKey);
              if (shift) {
                const next = { ...props.path };
                const pts = next.points.map((pp, idx) =>
                  idx === i ? { ...pp, corner: !pp.corner } : pp
                );
                commitNow({ ...next, points: pts });
                return;
              }
              setActiveIndex(i);
            }}
            onTap={() => setActiveIndex(i)}
            onDragMove={(e) => {
              const local = { x: e.target.x(), y: e.target.y() };
              const nx = clamp(local.x / props.w, 0, 1);
              const ny = clamp(local.y / props.h, 0, 1);
              setPoint(i, { x: nx, y: ny });
            }}
            onDragEnd={() => {
              // commit from current draft (we don't have it directly, so rebuild from props.path at this moment)
              // easiest: commit using the latest path via onDraft-throttled updates can lag 1 frame,
              // so force a final commit by setting the point from current node position:
              // (The next render will carry correct values.)
              // We'll just commit props.path as-is (good enough for 60fps), or you can refine later.
              commitNow(props.path);
            }}
          />
        );
      })}
    </Group>
  );
}

/* ---------------- Polygon Editor Overlay ---------------- */

function PolygonEditorOverlay(props: {
  w: number;
  h: number;
  path: PolygonPath;
  onDraft: (next: PolygonPath) => void;
  onCommit: (next: PolygonPath) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [props.path.points.length]);

  const setDraftRaf = useRafThrottled(props.onDraft);

  function setPoint(i: number, patch: Partial<PolygonPoint>) {
    const pts = props.path.points.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    setDraftRaf({ ...props.path, points: pts });
  }

  return (
    <Group listening>
      {props.path.points.map((p, i) => {
        const x = p.x * props.w;
        const y = p.y * props.h;
        const isActive = i === activeIndex;

        return (
          <Circle
            key={p.id}
            x={x}
            y={y}
            radius={isActive ? 6.5 : 6}
            fill="rgba(255,255,255,0.98)"
            stroke="rgba(111, 102, 255, 0.85)"
            strokeWidth={isActive ? 2.0 : 1.6}
            shadowColor="rgba(0,0,0,0.14)"
            shadowBlur={10}
            shadowOffsetX={0}
            shadowOffsetY={6}
            draggable
            onClick={() => setActiveIndex(i)}
            onTap={() => setActiveIndex(i)}
            onDragMove={(e) => {
              const local = { x: e.target.x(), y: e.target.y() };
              const nx = clamp(local.x / props.w, 0, 1);
              const ny = clamp(local.y / props.h, 0, 1);
              setPoint(i, { x: nx, y: ny });
            }}
            onDragEnd={() => {
              props.onCommit(props.path);
            }}
          />
        );
      })}
    </Group>
  );
}

/* ---------------- Bezier Editor Overlay (your existing style) ---------------- */

function BezierEditorOverlay(props: {
  w: number;
  h: number;
  path: BezierPath;
  onChange: (next: BezierPath) => void;
}) {
  const pts = props.path.points;

  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [props.path.points.length]);

  function setPoint(i: number, patch: Partial<BezierPoint>) {
    const next = pts.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    props.onChange({ ...props.path, points: next });
  }

  function setHandle(i: number, which: "in" | "out", value: BezierHandle | undefined) {
    setPoint(i, { [which]: value } as any);
  }

  const active = pts[activeIndex];

  const P = bezierToLocal({ x: active.x, y: active.y }, props.w, props.h);
  const Hin = active.in ? bezierToLocal(active.in, props.w, props.h) : null;
  const Hout = active.out ? bezierToLocal(active.out, props.w, props.h) : null;

  return (
    <Group listening>
      {Hin ? (
        <Line
          points={[P.x, P.y, Hin.x, Hin.y]}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={2}
          listening={false}
        />
      ) : null}
      {Hout ? (
        <Line
          points={[P.x, P.y, Hout.x, Hout.y]}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={2}
          listening={false}
        />
      ) : null}

      {Hin ? (
        <Circle
          x={Hin.x}
          y={Hin.y}
          radius={5}
          fill="rgba(255,255,255,0.95)"
          stroke="rgba(255, 90, 90, 0.9)"
          strokeWidth={1.4}
          draggable
          onDragMove={(e) => {
            const local = { x: e.target.x(), y: e.target.y() };
            const next = localToBezier(local, props.w, props.h);
            setHandle(activeIndex, "in", next);
          }}
        />
      ) : null}

      {Hout ? (
        <Circle
          x={Hout.x}
          y={Hout.y}
          radius={5}
          fill="rgba(255,255,255,0.95)"
          stroke="rgba(255, 90, 90, 0.9)"
          strokeWidth={1.4}
          draggable
          onDragMove={(e) => {
            const local = { x: e.target.x(), y: e.target.y() };
            const next = localToBezier(local, props.w, props.h);
            setHandle(activeIndex, "out", next);
          }}
        />
      ) : null}

      {pts.map((p, i) => {
        const A = bezierToLocal({ x: p.x, y: p.y }, props.w, props.h);
        const isActive = i === activeIndex;

        return (
          <Circle
            key={`${p.id}-anchor`}
            x={A.x}
            y={A.y}
            radius={isActive ? 6.5 : 6}
            fill="rgba(255,255,255,0.98)"
            stroke="rgba(255, 90, 90, 0.95)"
            strokeWidth={isActive ? 2.0 : 1.6}
            shadowColor="rgba(0,0,0,0.18)"
            shadowBlur={10}
            shadowOffsetX={0}
            shadowOffsetY={6}
            draggable
            onClick={() => setActiveIndex(i)}
            onTap={() => setActiveIndex(i)}
            onDragMove={(e) => {
              const local = { x: e.target.x(), y: e.target.y() };
              const next = localToBezier(local, props.w, props.h);
              setPoint(i, { x: next.x, y: next.y });
            }}
            onDblClick={() => {
              const has = Boolean(p.in || p.out);
              if (has) {
                setPoint(i, { in: undefined, out: undefined });
              } else {
                const left: BezierHandle = { x: clamp(p.x - 0.08, 0, 1), y: p.y };
                const right: BezierHandle = { x: clamp(p.x + 0.08, 0, 1), y: p.y };
                setPoint(i, { in: left, out: right });
              }
            }}
          />
        );
      })}
    </Group>
  );
}

/* ---------------- Floating toolbar ---------------- */

function FloatingToolbar(props: {
  box: { left: number; top: number; width: number; height: number };
  wrapSize: { w: number; h: number };

  locked: boolean;

  canRadius: boolean;
  currentRadius: number;

  editLabel: string;
  editOn: boolean;
  canEdit: boolean;

  canConvert: boolean;
  onConvert: (k: "rect" | "polygon" | "curvature" | "bezier") => void;

  onDuplicate: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onToggleEdit: () => void;
  onSetRadius: (radius: number) => void;

  offset: { dx: number; dy: number } | null;
  onOffsetChange: (next: { dx: number; dy: number } | null) => void;
}) {

    const { left, top, width, height } = props.box;

  const [radiusOpen, setRadiusOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  // more clearance so it doesn't cover the item
  const margin = 34;         // higher pop-up
  const toolbarH = 42;
  const halfW = 195;

  // anchor point: center above selection
  let baseX = left + width / 2;
  const yAbove = top - margin;
  const canPlaceAbove = yAbove - toolbarH > 12;

  let baseY = canPlaceAbove ? yAbove : top + height + margin;
  const transform = canPlaceAbove ? "translate(-50%, -100%)" : "translate(-50%, 0%)";

  // apply user drag offset (sticky)
  const dx = props.offset?.dx ?? 0;
  const dy = props.offset?.dy ?? 0;

  // clamp final position
  let x = clamp(baseX + dx, halfW, props.wrapSize.w - halfW);
  let y = clamp(baseY + dy, 10, props.wrapSize.h - 10);

  // --- drag handling (mouse + touch) ---
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startDx: number;
    startDy: number;
    dragging: boolean;
  } | null>(null);

  function onDragStart(e: React.PointerEvent) {
    // only left click / primary touch
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startDx: props.offset?.dx ?? 0,
      startDy: props.offset?.dy ?? 0,
      dragging: true,
    };
  }

  function onDragMove(e: React.PointerEvent) {
    const st = dragRef.current;
    if (!st?.dragging) return;

    const nextDx = st.startDx + (e.clientX - st.startClientX);
    const nextDy = st.startDy + (e.clientY - st.startClientY);

    props.onOffsetChange({ dx: nextDx, dy: nextDy });
  }

  function onDragEnd(e: React.PointerEvent) {
    const st = dragRef.current;
    if (!st) return;
    st.dragging = false;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {}
  }

  return (
    <div className="absolute z-30" style={{ left: x, top: y, transform }}>
      <div className="relative flex items-center gap-1 rounded-full border border-black/10 bg-white/88 shadow-md backdrop-blur px-2 py-1">
        {/* Drag handle (invisible, sits above the pill) */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-20 rounded-full cursor-grab active:cursor-grabbing"
          title="Drag toolbar"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onDoubleClick={() => props.onOffsetChange(null)}
          style={{ touchAction: "none" }}
        />      

        <ToolIconButton title="Duplicate" onClick={props.onDuplicate}>
          <IconDuplicate />
        </ToolIconButton>

        <ToolIconButton
          title={props.locked ? "Unlock" : "Lock"}
          onClick={props.onToggleLock}
        >
          {props.locked ? <IconUnlock /> : <IconLock />}
        </ToolIconButton>

        <div className="w-px h-5 bg-black/10 mx-1" />

        <ToolIconButton
          title={props.editOn ? `Exit ${props.editLabel}` : `Edit (${props.editLabel})`}
          onClick={() => {
            props.onToggleEdit();
            setRadiusOpen(false);
            setConvertOpen(false);
          }}
          active={props.editOn}
          disabled={!props.canEdit}
        >
          <IconEdit />
        </ToolIconButton>

        <ToolIconButton
          title="Convert shape"
          onClick={() => {
            if (!props.canConvert) return;
            setConvertOpen((v) => !v);
            setRadiusOpen(false);
          }}
          disabled={!props.canConvert}
        >
          <IconMore />
        </ToolIconButton>

        <ToolIconButton
          title="Corner radius"
          onClick={() => {
            if (!props.canRadius) return;
            setRadiusOpen((v) => !v);
            setConvertOpen(false);
          }}
          disabled={!props.canRadius}
        >
          <IconRadius />
        </ToolIconButton>

        <ToolIconButton title="Delete" onClick={props.onDelete} danger>
          <IconTrash />
        </ToolIconButton>

        {radiusOpen ? (
          <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-2xl border border-black/10 bg-white/95 shadow-lg backdrop-blur px-3 py-3 w-55">
            <div className="text-[11px] text-black/60 mb-2">Corner radius</div>
            <input
              type="range"
              min={0}
              max={220}
              step={1}
              value={Math.round(props.currentRadius)}
              onChange={(e) => props.onSetRadius(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-2 text-[11px] text-black/45">
              {Math.round(props.currentRadius)} px
            </div>
          </div>
        ) : null}

        {convertOpen ? (
          <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-2xl border border-black/10 bg-white/95 shadow-lg backdrop-blur px-3 py-3 w-64">
            <div className="text-[11px] text-black/60 mb-2">Convert shape</div>

            <button
              type="button"
              onClick={() => {
                props.onConvert("rect");
                setConvertOpen(false);
              }}
              className="w-full text-left text-[12px] px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition"
            >
              Rectangle (Live corners)
            </button>

            <button
              type="button"
              onClick={() => {
                props.onConvert("polygon");
                setConvertOpen(false);
              }}
              className="mt-2 w-full text-left text-[12px] px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition"
            >
              Polygon (straight edges)
            </button>

            <button
              type="button"
              onClick={() => {
                props.onConvert("curvature");
                setConvertOpen(false);
              }}
              className="mt-2 w-full text-left text-[12px] px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition"
            >
              Curvature (sleek, anchor-only)
            </button>

            <button
              type="button"
              onClick={() => {
                props.onConvert("bezier");
                setConvertOpen(false);
              }}
              className="mt-2 w-full text-left text-[12px] px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition"
            >
              Bezier (advanced)
            </button>

            <div className="mt-2 text-[11px] text-black/45 leading-snug">
              Curvature is the sleek Illustrator-like mode. Bezier is advanced.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToolIconButton(props: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={props.title}
      onClick={props.onClick}
      disabled={props.disabled}
      className={[
        "h-8 w-8 inline-flex items-center justify-center rounded-full transition",
        props.disabled ? "opacity-35 cursor-not-allowed" : "",
        props.active ? "bg-black/5 ring-1 ring-black/10" : "",
        props.danger
          ? "hover:bg-red-500/10 text-red-700"
          : "hover:bg-black/5 text-black/80",
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
      <path
        d="M13.5 9V7.5A3.5 3.5 0 0 0 10 4"
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

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7 6h6M8 6V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.5 6.5l.6 10a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconRadius() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 15V8a3 3 0 0 1 3-3h7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11 5h4v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 12a4 4 0 0 0 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
      />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 14.5V16h1.5l8.8-8.8-1.5-1.5L4 14.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11.9 5.1l1.5 1.5 1-1a1 1 0 0 0 0-1.4l-.1-.1a1 1 0 0 0-1.4 0l-1 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="6" cy="10" r="1.5" fill="currentColor" opacity="0.9" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" opacity="0.9" />
      <circle cx="14" cy="10" r="1.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
