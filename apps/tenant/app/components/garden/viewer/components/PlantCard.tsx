"use client";

import type { GardenPlanting } from "@/lib/garden/load-plantings";
import type { Role } from "../types";
import { roleCard } from "../utils";

export default function PlantCard(props: {
  planting: GardenPlanting;
  role: Role;
  active?: boolean;
  onClick?: () => void;
}) {
  const card = roleCard(props.planting, props.role);

  return (
    <button
      onClick={props.onClick}
      className={[
        "min-w-55 max-w-70 rounded-2xl border px-4 py-3 text-left shadow-sm",
        "bg-(--rose-surface) border-(--rose-border) transition-transform active:scale-[0.99]",
        props.active ? "ring-2 ring-[rgba(16,187,191,0.35)]" : "",
      ].join(" ")}
    >
      <div className="text-xs text-(--rose-muted)">{card.subtitle}</div>
      <div className="mt-1 text-base font-semibold text-(--rose-ink)">{card.title}</div>
      <div className="mt-2 text-sm leading-snug text-(--rose-ink) opacity-80 line-clamp-3">
        {card.body ? card.body : "(No notes yet.)"}
      </div>
    </button>
  );
}
