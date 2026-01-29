"use client";

import React from "react";
import {
  Group,
  Rect,
  Text,
  Image as KonvaImage,
  Circle,
} from "react-konva";
import type { Item } from "../types";
import { useTreeImages, type TreeVariant } from "../hooks/useTreeImages";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function kindOf(it: Item) {
  return String(it?.type ?? "bed").toLowerCase();
}

function normalizeTreeVariant(v: any): TreeVariant | null {
  const s = String(v ?? "").trim();
  if (
    s === "tree-01" ||
    s === "tree-02" ||
    s === "tree-03" ||
    s === "tree-04" ||
    s === "citrus"
  ) {
    return s as TreeVariant;
  }
  return null;
}

function pickTreeVariant(it: Item): TreeVariant {
  // ✅ Studio stores: meta.tree.variant
  const fromStudio = normalizeTreeVariant((it as any)?.meta?.tree?.variant);

  // fallbacks if older docs used different keys
  const fromAlt1 = normalizeTreeVariant((it as any)?.meta?.tree_variant);
  const fromAlt2 = normalizeTreeVariant((it as any)?.meta?.variant);

  return fromStudio ?? fromAlt1 ?? fromAlt2 ?? "tree-03";
}

export default function ItemNode(props: {
  item: Item;
  selected: boolean;
  onSelect: () => void;
}) {
  const it = props.item;
  const treeImages = useTreeImages();

  const w = clamp(it.w ?? 120, 18, 5000);
  const h = clamp(it.h ?? 80, 18, 5000);

  const t = kindOf(it);
  const isBed = t === "bed";
  const isTree = t === "tree";
  const isStructure = t === "structure";

  // Ink labels (your canvas is paper now)
  const labelColor = "rgba(12,18,32,0.78)";
  const mutedInk = "rgba(12,18,32,0.45)";

  // Selected ring accent
  const selectStroke = "rgba(96,165,250,0.95)";

  // Bed styling (warm garden paper/soil)
  const bedFillA = "rgba(233,226,214,0.92)";
  const bedFillB = "rgba(215,207,195,0.92)";
  const bedStroke = "rgba(94,118,88,0.22)";

  // Structure styling (stone)
  const stoneFillA = "rgba(215,215,215,0.80)";
  const stoneFillB = "rgba(190,190,190,0.80)";
  const stoneStroke = "rgba(12,18,32,0.14)";

  // Tree image variant from Studio
  const variant = pickTreeVariant(it);
  const img = treeImages[variant];

  // Corner radius: beds/structures are rounded; trees are image-only (no box)
  const r = 14;

  return (
    <Group
      x={it.x}
      y={it.y}
      rotation={it.r ?? 0}
      onClick={props.onSelect}
      onTap={props.onSelect}
    >
      {/* -------------------------
          TREE (no surrounding box)
         ------------------------- */}
      {isTree ? (
        <>
          {/* Selection halo only when selected (still no box) */}
          {props.selected ? (
            <Circle
              x={w * 0.5}
              y={h * 0.52}
              radius={Math.max(18, Math.min(w, h) * 0.46)}
              stroke={selectStroke}
              strokeWidth={2.5}
              opacity={0.55}
              listening={false}
            />
          ) : null}

          {/* The actual tree image */}
          {img ? (
            <KonvaImage
              image={img}
              x={0}
              y={0}
              width={w}
              height={h}
              listening={false} // clicks handled by Group
            />
          ) : (
            // Fallback while loading images (still no box)
            <Circle
              x={w * 0.5}
              y={h * 0.5}
              radius={Math.max(12, Math.min(w, h) * 0.35)}
              fill="rgba(94,118,88,0.35)"
              listening={false}
            />
          )}
        </>
      ) : (
        /* -------------------------
           BED / STRUCTURE
           (still “garden” styled)
           ------------------------- */
        <>
          {/* subtle shadow */}
          <Rect
            x={2}
            y={4}
            width={w}
            height={h}
            cornerRadius={r}
            fill="rgba(12,18,32,0.10)"
            opacity={0.16}
            listening={false}
          />

          <Rect
            width={w}
            height={h}
            cornerRadius={r}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: w, y: h }}
            fillLinearGradientColorStops={
              isBed
                ? [0, bedFillA, 1, bedFillB]
                : isStructure
                ? [0, stoneFillA, 1, stoneFillB]
                : [0, "rgba(210,210,210,0.55)", 1, "rgba(180,180,180,0.55)"]
            }
            stroke={props.selected ? selectStroke : isBed ? bedStroke : stoneStroke}
            strokeWidth={props.selected ? 2.25 : 1}
          />

          {/* inner bed border for depth */}
          {isBed ? (
            <Rect
              x={8}
              y={8}
              width={Math.max(0, w - 16)}
              height={Math.max(0, h - 16)}
              cornerRadius={Math.max(10, r - 6)}
              stroke="rgba(12,18,32,0.08)"
              strokeWidth={1}
              listening={false}
            />
          ) : null}
        </>
      )}

      {/* -------------------------
          LABELS: only when selected
         ------------------------- */}
      {props.selected ? (
        <>
          <Text
            text={it.label ?? it.id}
            fontSize={12}
            fill={labelColor}
            padding={10}
            width={w}
            listening={false}
          />

          {/* optional tiny type hint (remove later) */}
          <Text
            text={isTree ? variant : isBed ? "Bed" : isStructure ? "Structure" : ""}
            fontSize={10}
            fill={mutedInk}
            x={10}
            y={Math.max(0, h - 18)}
            listening={false}
          />
        </>
      ) : null}
    </Group>
  );
}
