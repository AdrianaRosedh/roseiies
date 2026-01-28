"use client";

import { useEffect, useMemo, useRef } from "react";
import type { GardenPlanting } from "@/lib/garden/load-plantings";
import type { Role } from "../types";
import PlantCard from "./PlantCard";

export default function PlantCardsRow(props: {
  plantings: GardenPlanting[];
  role: Role;
  selectedPlantingId: string | null;
  onSelectPlanting: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const selectedIndex = useMemo(() => {
    if (!props.selectedPlantingId) return -1;
    return props.plantings.findIndex((p) => p.id === props.selectedPlantingId);
  }, [props.plantings, props.selectedPlantingId]);

  useEffect(() => {
    if (!scrollerRef.current) return;
    if (selectedIndex < 0) return;
    const el = scrollerRef.current;
    const child = el.children[selectedIndex] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedIndex]);

  return (
    <div
      ref={scrollerRef}
      className="flex gap-3 overflow-x-auto pb-1 pt-2 [-webkit-overflow-scrolling:touch]"
    >
      {props.plantings.map((p) => (
        <PlantCard
          key={p.id}
          planting={p}
          role={props.role}
          active={p.id === props.selectedPlantingId}
          onClick={() => props.onSelectPlanting(p.id)}
        />
      ))}
    </div>
  );
}
