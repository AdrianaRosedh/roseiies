"use client";

export type BedResult = { id: string; label: string };
export type CropResult = {
  plantingId: string;
  crop: string;
  bedId: string; // canvas bed id
  bedLabel: string;
  subtitle?: string;
};

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

  const hasBeds = props.bedResults.length > 0;
  const hasCrops = props.cropResults.length > 0;

  return (
    <div
      className="mt-2 rounded-2xl border shadow-sm"
      style={{
        borderColor: "var(--border)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(12px)",
        padding: 10,
        width: 360,
        maxWidth: "80vw",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Results for “{props.query.trim()}”
        </div>
        <button
          onClick={props.onClose}
          style={{
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--fg)",
            borderRadius: 10,
            padding: "4px 8px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Esc
        </button>
      </div>

      {!hasBeds && !hasCrops ? (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          No matches yet.
        </div>
      ) : (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {hasBeds ? (
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                Beds
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {props.bedResults.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => props.onPickBed(b.id)}
                    style={{
                      textAlign: "left",
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--fg)",
                      borderRadius: 14,
                      padding: "10px 10px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {hasCrops ? (
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                Plantings
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {props.cropResults.map((c) => (
                  <button
                    key={c.plantingId}
                    onClick={() => props.onPickCrop(c.bedId, c.plantingId)}
                    style={{
                      textAlign: "left",
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--fg)",
                      borderRadius: 14,
                      padding: "10px 10px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.crop}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {c.bedLabel}
                      {c.subtitle ? ` • ${c.subtitle}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
