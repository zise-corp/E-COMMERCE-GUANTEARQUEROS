import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ESCUDO_PATH } from "@/components/brand/escudo-path";

export const runtime = "nodejs";
export const alt = "Guantearqueros Bolivia · Guantes de arquero y DREI Athletic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagen social con el escudo real y Anton embebida (OFL, copia en src/app/fonts).
 * Satori no soporta repeating-linear-gradient: la franja diagonal se arma con
 * barras inclinadas una por una.
 */
export default async function OpengraphImage() {
  const anton = await readFile(join(process.cwd(), "src/app/fonts/Anton-Regular.ttf"));

  const stripes = Array.from({ length: 62 }, (_, i) => (
    <div
      key={i}
      style={{
        width: 26,
        height: 120,
        background: i % 2 === 0 ? "#FA2A00" : "#0A0A0A",
        transform: "skewX(-25deg)",
      }}
    />
  ));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0A0A",
          backgroundImage: "radial-gradient(120% 80% at 50% -10%, #17120F 0%, #0A0A0A 55%)",
          fontFamily: "Anton",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", padding: "68px 72px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width={100} height={118} viewBox="0 0 100 100">
              <defs>
                <linearGradient id="og" x1="18%" y1="0%" x2="82%" y2="100%">
                  <stop offset="0" stopColor="#FA2A00" />
                  <stop offset="1" stopColor="#C81F00" />
                </linearGradient>
              </defs>
              <path d={ESCUDO_PATH} fillRule="evenodd" fill="url(#og)" />
            </svg>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 66, lineHeight: 1, letterSpacing: "0.01em" }}>
                <span style={{ color: "#FA2A00" }}>UANTE</span>
                <span style={{ color: "#F5F3F0" }}>ARQUEROS</span>
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 21,
                  letterSpacing: "0.26em",
                  color: "#6E6B67",
                }}
              >
                BOLIVIA · COCHABAMBA
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 64,
              display: "flex",
              fontSize: 62,
              lineHeight: 1.04,
              color: "#F5F3F0",
              maxWidth: 1000,
              textTransform: "uppercase",
            }}
          >
            Guantes de arquero, DREI Athletic y accesorios
          </div>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              fontSize: 26,
              letterSpacing: "0.06em",
              color: "#A8A5A0",
            }}
          >
            ENVÍOS A TODO EL PAÍS · RETIRO EN COCHABAMBA EL MISMO DÍA
          </div>
        </div>

        <div style={{ display: "flex", height: 30, overflow: "hidden" }}>
          {stripes}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Anton", data: anton, weight: 400, style: "normal" }],
    },
  );
}
