import type { StudioModule, Swatch } from "../../editor-core/types";

const ROSEIIES_SWATCHES: Swatch[] = [
  { name: "Roseiies Olive", value: "#5e7658" },
  { name: "Soft Olive", value: "#93a48a" },
  { name: "Warm Sand", value: "#e9e2d6" },
  { name: "Stone", value: "#d7d7d7" },
  { name: "Ink", value: "#0b1220" },
  { name: "Sky", value: "#60a5fa" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Violet", value: "#a855f7" },
  { name: "Rose", value: "#fb7185" }
];

const GardenModule: StudioModule = {
  id: "garden",
  title: "Garden Layouts",
  subtitle: "Design gardens, beds, zones, paths, and structures.",
  swatches: ROSEIIES_SWATCHES,

  tools: [
    { id: "bed", label: "Bed" },
    { id: "zone", label: "Zone" },
    { id: "path", label: "Path" },
    { id: "structure", label: "Structure" },
    { id: "label", label: "Label" }
  ],

  defaults: {
    canvas: { width: 1600, height: 1000 },
    // default item styles per type (can be overridden per item)
    stylesByType: {
      bed: {
        fill: "#e9e2d6",
        fillOpacity: 0.9,
        stroke: "#0b1220",
        strokeOpacity: 0.22,
        strokeWidth: 1.4,
        radius: 16,
        shadow: { color: "#000000", opacity: 0.10, blur: 14, offsetX: 0, offsetY: 10 }
      },
      zone: {
        fill: "#60a5fa",
        fillOpacity: 0.10,
        stroke: "#60a5fa",
        strokeOpacity: 0.22,
        strokeWidth: 1.2,
        radius: 18,
        shadow: { color: "#000000", opacity: 0.0, blur: 0, offsetX: 0, offsetY: 0 }
      },
      path: {
        fill: "#0b1220",
        fillOpacity: 0.06,
        stroke: "#0b1220",
        strokeOpacity: 0.12,
        strokeWidth: 1.0,
        radius: 999,
        shadow: { color: "#000000", opacity: 0.0, blur: 0, offsetX: 0, offsetY: 0 }
      },
      structure: {
        fill: "#a855f7",
        fillOpacity: 0.12,
        stroke: "#a855f7",
        strokeOpacity: 0.25,
        strokeWidth: 1.2,
        radius: 18,
        shadow: { color: "#000000", opacity: 0.08, blur: 12, offsetX: 0, offsetY: 8 }
      },
      label: {
        fill: "#0b1220",
        fillOpacity: 0.04,
        stroke: "#0b1220",
        strokeOpacity: 0.10,
        strokeWidth: 1.0,
        radius: 14,
        shadow: { color: "#000000", opacity: 0.0, blur: 0, offsetX: 0, offsetY: 0 }
      }
    }
  }
};

export default GardenModule;