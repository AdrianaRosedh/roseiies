"use client";

import React from "react";
import AppSectionToolbar from "@/app/studio/editor-core/shell/components/AppSectionToolbar";

export default function GardenSheetsToolbar(props: {
  loading: boolean;
  lastError: string | null;

  onRefresh: () => void | Promise<void>;
  onAddColumn: () => unknown | Promise<unknown>;

  onGoDesign?: () => void;
  onDeleteSelected?: (() => void) | undefined;
}) {
  return (
    <AppSectionToolbar
      actions={[
        ...(props.onGoDesign
          ? [{ kind: "button", label: "Map", onClick: props.onGoDesign, tone: "ghost" } as const]
          : []),

        ...(props.onDeleteSelected
          ? [
              {
                kind: "button",
                label: "Trash",
                onClick: props.onDeleteSelected,
                tone: "ghost",
                title: "Delete selected",
              } as const,
            ]
          : []),

        {
          kind: "button",
          label: "+ Column",
          onClick: () => props.onAddColumn(),
          tone: "ghost",
          title: "Add a column",
        },

        { kind: "separator" },

        {
          kind: "button",
          label: "Refresh",
          onClick: () => props.onRefresh(),
          tone: "ghost",
          disabled: props.loading,
          title: "Refresh rows",
        },
      ]}
      status={{
        loading: props.loading,
        error: props.lastError,
        loadingText: "Updating…",
      }}
    />
  );
}
