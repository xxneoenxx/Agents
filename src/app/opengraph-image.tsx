import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const runtime = "nodejs";
export const alt = `${site.name} – Fachbetrieb nach WHG`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #060912 100%)",
          padding: "70px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #fbbf24, #d97706)",
            }}
          />
          <div style={{ display: "flex", gap: 10, fontSize: 36, fontWeight: 700 }}>
            <span style={{ color: "white" }}>Krebs</span>
            <span style={{ color: "#fbbf24" }}>Tanksysteme</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ color: "white", fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
            Heizöltank demontieren, erneuern & sicher entsorgen
          </div>
          <div style={{ color: "#94a3b8", fontSize: 30 }}>
            {`Fachbetrieb nach WHG · TÜV-Süd-überwacht · ${site.address.region}`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {["Demontage", "Reinigung", "Wärmespeicher", "GFK-Reparatur"].map((t) => (
            <div
              key={t}
              style={{
                color: "#fbbf24",
                fontSize: 24,
                border: "1px solid rgba(245,158,11,0.4)",
                borderRadius: 999,
                padding: "8px 22px",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
