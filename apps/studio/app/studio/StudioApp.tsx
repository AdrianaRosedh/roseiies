"use client";

import GardenModule from "./modules/garden/module";
import StudioShell from "./editor-core/StudioShell";

export default function StudioApp() {
  // V1: we load only the Garden module.
  // Later: modules array + module selector.
  return <StudioShell module={GardenModule} />;
}