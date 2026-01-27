"use client";

import React from "react";
import AppTopBar from "../../../editor-core/shell/components/AppTopBar";
import AppSubBar from "../../../editor-core/shell/components/AppSubBar";
import GardenMobileTopNav from "./GardenMobileTopNav";

export default function GardenAppHeader(props: {
  sectionLabel: string | null;
  viewLabel?: string | null;

  statusLine?: React.ReactNode;

  subLeft?: React.ReactNode;
  subRight?: React.ReactNode;

  center?: React.ReactNode;
  actions?: React.ReactNode;

  onGoWorkplace?: () => void;
}) {
  const {
    sectionLabel,
    viewLabel,
    statusLine,
    subLeft,
    subRight,
    center,
    actions,
    onGoWorkplace,
  } = props;

  return (
    <>
      {/* ✅ MOBILE HEADER (shared across Dashboard / Map / Sheets) */}
      <GardenMobileTopNav
        viewLabel={viewLabel ?? ""}
        onGoWorkplace={onGoWorkplace}
      />

      {/* ✅ DESKTOP HEADER */}
      <div className="hidden md:block">
        <AppTopBar
          appLabel="Garden"
          sectionLabel={sectionLabel}
          viewLabel={viewLabel}
          statusLine={statusLine}
          center={center}
          actions={<div className="flex items-center gap-2">{actions}</div>}
        />
      </div>

      {/* ✅ DESKTOP-only second toolbar row */}
      {subLeft || subRight ? (
        <div className="hidden lg:block">
          <AppSubBar>
            <div className="flex items-center gap-2 min-w-0">{subLeft}</div>
            <div className="flex items-center gap-2 shrink-0">{subRight}</div>
          </AppSubBar>
        </div>
      ) : null}
    </>
  );
}
