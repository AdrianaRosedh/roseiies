"use client";

import React from "react";
import { Group, Rect, Text, Image as KonvaImage, Circle } from "react-konva";
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
  const fromStudio = normalizeTreeVariant((it as any)?.meta?.tree?.variant);
  const fromAlt1 = normalizeTreeVariant((it as any)?.meta?.tree_variant);
  const fromAlt2 = normalizeTreeVariant((it as any)?.meta?.variant);
  return fromStudio ?? fromAlt1 ?? fromAlt2 ?? "tree-03";
}

// Accent
const SELECT_STROKE = "rgba(96,165,250,0.95)";

// ✅ Beds: make brown lighter here
const BED_MUD_A = "#6b4a2e";
const BED_MUD_B = "#4f3523";
const BED_STROKE = "rgba(60,40,25,0.35)";
const BED_INNER = "rgba(255,255,255,0.08)";

// Structure stone
const STONE_A = "rgba(215,215,215,0.82)";
const STONE_B = "rgba(190,190,190,0.82)";
const STONE_STROKE = "rgba(12,18,32,0.16)";

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

  const labelColor = isBed
    ? "rgba(245,240,232,0.78)"
    : "rgba(12,18,32,0.78)";
  const muted = isBed ? "rgba(245,240,232,0.55)" : "rgba(12,18,32,0.45)";

  const variant = pickTreeVariant(it);
  const img = treeImages[variant];

  const r = 16;

  return (
    <Group x={it.x} y={it.y} rotation={it.r ?? 0}>
      {/* ✅ TREE: make the visible node listen + handle clicks */}
      {isTree ? (
        <>
          {props.selected ? (
            <Circle
              x={w * 0.5}
              y={h * 0.52}
              radius={Math.max(18, Math.min(w, h) * 0.46)}
              stroke={SELECT_STROKE}
              strokeWidth={2.5}
              opacity={0.55}
              listening={false}
            />
          ) : null}

          {img ? (
            <KonvaImage
              image={img}
              x={0}
              y={0}
              width={w}
              height={h}
              // ✅ IMPORTANT: must be listening for clicks to work
              listening={true}
              onClick={props.onSelect}
              onTap={props.onSelect}
            />
          ) : (
            <Circle
              x={w * 0.5}
              y={h * 0.5}
              radius={Math.max(12, Math.min(w, h) * 0.35)}
              fill="rgba(94,118,88,0.35)"
              // ✅ IMPORTANT: must be listening for clicks to work
              listening={true}
              onClick={props.onSelect}
              onTap={props.onSelect}
            />
          )}
        </>
      ) : (
        <>
          {/* subtle shadow */}
          <Rect
            x={2}
            y={5}
            width={w}
            height={h}
            cornerRadius={r}
            fill="rgba(0,0,0,0.18)"
            opacity={0.18}
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
                ? [0, BED_MUD_A, 1, BED_MUD_B]
                : isStructure
                ? [0, STONE_A, 1, STONE_B]
                : [0, "rgba(210,210,210,0.55)", 1, "rgba(180,180,180,0.55)"]
            }
            stroke={props.selected ? SELECT_STROKE : isBed ? BED_STROKE : STONE_STROKE}
            strokeWidth={props.selected ? 2.4 : 1.2}
            // ✅ beds/structures can still be clicked
            listening={true}
            onClick={props.onSelect}
            onTap={props.onSelect}
          />

          {isBed ? (
            <Rect
              x={8}
              y={8}
              width={Math.max(0, w - 16)}
              height={Math.max(0, h - 16)}
              cornerRadius={Math.max(10, r - 6)}
              stroke={BED_INNER}
              strokeWidth={1}
              listening={false}
            />
          ) : null}
        </>
      )}

      {/* Labels only when selected */}
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
          <Text
            text={isTree ? variant : isBed ? "Bed" : isStructure ? "Structure" : ""}
            fontSize={10}
            fill={muted}
            x={10}
            y={Math.max(0, h - 18)}
            listening={false}
          />
        </>
      ) : null}
    </Group>
  );
}
