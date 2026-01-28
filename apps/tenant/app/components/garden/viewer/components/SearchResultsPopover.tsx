"use client";

export type BedResult = {
  id: string;
  label: string;
};

export type CropResult = {
  plantingId: string;
  crop: string;
  bedId: string;
  bedLabel: string;
  subtitle?: string; // e.g. status
};

function highlight(text: string, q: string) {
  const s = q.trim();
  if (!s) return text;

  const i = text.toLowerCase().indexOf(s.toLowerCase());
  if (i < 0) return text;

  const a = text.slice(0, i);
  const b = text.slice(i, i + s.length);
  const c = text.slice(i + s.length);

  return (
    <>
      {a}
      <span className="font-semibold text-(--rose-ink)">{b}</span>
      {c}
    </>
  );
}

export default function SearchResultsPopover(props: {
  open: boolean;
  query: string;

  bedResults: BedResult[];
  cropResults: CropResult[];

  onPickBed: (bedId: string) => void;
  onPickCrop: (bedId: string, plantingId: string) => void;

  onClose: () => void;
}) {
  if (!props.open) return null;

  const hasAny = props.bedResults.length > 0 || props.cropResults.length > 0;

  return (
    <div className="pointer-events-auto mt-2 w-[min(560px,90vw)]">
      <div className="rounded-2xl border border-(--rose-border) bg-(--rose-surface)/92 backdrop-blur shadow-sm overflow-hidden">
        {!hasAny ? (
          <div className="p-4 text-sm text-(--rose-muted)">No results.</div>
        ) : (
          <div className="max-h-[56vh] overflow-auto">
            {/* Beds */}
            {props.bedResults.length > 0 ? (
              <div className="p-2">
                <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-(--rose-muted)">
                  Beds
                </div>
                <div className="flex flex-col">
                  {props.bedResults.slice(0, 8).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        props.onPickBed(b.id);
                        props.onClose();
                      }}
                      className="rounded-xl px-3 py-2 text-left hover:bg-black/5 active:bg-black/10"
                    >
                      <div className="text-sm text-(--rose-ink)">
                        {highlight(b.label, props.query)}
                      </div>
                      <div className="text-xs text-(--rose-muted)">Focus bed</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Crops */}
            {props.cropResults.length > 0 ? (
              <div className="p-2 border-t border-(--rose-border)">
                <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-(--rose-muted)">
                  Crops
                </div>
                <div className="flex flex-col">
                  {props.cropResults.slice(0, 10).map((r) => (
                    <button
                      key={r.plantingId}
                      type="button"
                      onClick={() => {
                        props.onPickCrop(r.bedId, r.plantingId);
                        props.onClose();
                      }}
                      className="rounded-xl px-3 py-2 text-left hover:bg-black/5 active:bg-black/10"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="text-sm text-(--rose-ink)">
                          {highlight(r.crop || "Unknown", props.query)}
                        </div>
                        {r.subtitle ? (
                          <div className="text-xs text-(--rose-muted)">{r.subtitle}</div>
                        ) : null}
                      </div>
                      <div className="text-xs text-(--rose-muted)">
                        Bed: {highlight(r.bedLabel || "—", props.query)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
