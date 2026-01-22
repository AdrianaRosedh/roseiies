"use client";

import MobileSheet from "../../MobileSheet";

export default function ContextSheet(props: {
  open: boolean;
  onClose: () => void;

  store: any;
  portal: any;

  activeGarden: any;
  layoutsForGarden: any[];
  activeLayout: any;
}) {
  const activeGardenId = props.store?.state?.activeGardenId ?? "";
  const activeLayoutId = props.store?.state?.activeLayoutId ?? "";

  return (
    <MobileSheet
      open={props.open}
      title="Garden · Layout"
      onClose={props.onClose}
      heightClassName="h-[62vh]"
    >
      <div className="p-3 space-y-3">
        {/* Garden */}
        <div className="space-y-2">
          <div className="text-[11px] text-black/55">Garden</div>

          <select
            value={activeGardenId}
            onChange={(e) => props.store?.setActiveGarden?.(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm"
          >
            {(props.store?.state?.gardens ?? []).map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-3 text-sm"
              onClick={() => {
                const name = prompt("New garden name?");
                if (name?.trim()) props.store?.newGarden?.(name.trim());
              }}
            >
              + Garden
            </button>

            <button
              type="button"
              className="flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-3 text-sm disabled:opacity-40"
              disabled={!props.activeGarden}
              onClick={() => {
                const name = prompt("Rename garden:", props.activeGarden?.name ?? "");
                if (name?.trim()) props.store?.renameGarden?.(name.trim());
              }}
            >
              Rename
            </button>
          </div>
        </div>

        <div className="h-px bg-black/10" />

        {/* Layout */}
        <div className="space-y-2">
          <div className="text-[11px] text-black/55">Layout</div>

          <select
            value={activeLayoutId}
            onChange={(e) => props.store?.setActiveLayout?.(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm"
          >
            {(props.layoutsForGarden ?? []).map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.published ? "● " : ""}
                {l.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-3 text-sm disabled:opacity-40"
              disabled={!props.store?.state?.activeGardenId}
              onClick={() => {
                const name = prompt("New layout name?");
                if (name?.trim()) props.store?.newLayout?.(name.trim());
              }}
            >
              + Layout
            </button>

            <button
              type="button"
              className="flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-3 text-sm disabled:opacity-40"
              disabled={!props.activeLayout}
              onClick={() => {
                const name = prompt("Rename layout:", props.activeLayout?.name ?? "");
                if (name?.trim()) props.store?.renameLayout?.(name.trim());
              }}
            >
              Rename
            </button>
          </div>
        </div>

        <button
          type="button"
          className="w-full rounded-xl border border-black/10 bg-[rgba(94,118,88,0.18)] px-4 py-3 text-sm shadow-sm hover:bg-[rgba(94,118,88,0.24)] disabled:opacity-40"
          disabled={!props.activeLayout}
          onClick={() => {
            props.store?.publishLayout?.(props.portal?.tenantId);
            props.onClose();
          }}
        >
          Publish
        </button>
      </div>
    </MobileSheet>
  );
}