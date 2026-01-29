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

  // Roseiies-light palette
  const BORDER = "rgba(15, 23, 42, 0.12)";
  const INK = "rgba(15, 23, 42, 0.92)";
  const MUTED = "rgba(15, 23, 42, 0.58)";
  const SURFACE = "rgba(255,255,255,0.86)";
  const CARD = "rgba(255,255,255,0.92)";
  const HOVER = "rgba(251,113,133,0.12)";

  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: 20,
        border: `1px solid ${BORDER}`,
        background: SURFACE,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        padding: 12,
        width: "100%",
        boxShadow: "0 14px 34px rgba(0,0,0,0.10)",
      }}
    >
      {/* Header: NO extra X here (only the header X/back controls search now) */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, color: MUTED }}>
          Results for “{props.query.trim()}”
        </div>
      </div>

      {!hasBeds && !hasCrops ? (
        <div style={{ marginTop: 12, fontSize: 13, color: MUTED }}>
          No matches yet.
        </div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
          {hasBeds ? (
            <div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>
                Beds
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {props.bedResults.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => props.onPickBed(b.id)} // ✅ clickable
                    style={{
                      textAlign: "left",
                      border: `1px solid ${BORDER}`,
                      background: CARD,
                      color: INK,
                      borderRadius: 18,
                      padding: "12px 12px",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        HOVER;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        CARD;
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
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>
                Ingredients
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {props.cropResults.map((c) => (
                  <button
                    key={c.plantingId}
                    type="button"
                    onClick={() => props.onPickCrop(c.bedId, c.plantingId)} // ✅ clickable
                    style={{
                      textAlign: "left",
                      border: `1px solid ${BORDER}`,
                      background: CARD,
                      color: INK,
                      borderRadius: 18,
                      padding: "12px 12px",
                      cursor: "pointer",
                      boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        HOVER;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        CARD;
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 900 }}>
                      {c.crop}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
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
