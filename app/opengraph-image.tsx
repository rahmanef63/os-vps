import { ImageResponse } from "next/og";

// Social preview (og:image + twitter:image). Text-free by design — the mark on a
// graphite stage with a mint underglow; the headline text comes from og:title
// (the page <title>), so no font embedding is required (Satori needs fonts only
// for text). Generated from code — the toolchain has no SVG rasterizer.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Manef Shell OS";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "radial-gradient(120% 130% at 50% 0%, #26262b 0%, #111113 58%, #0a0a0b 100%)",
        }}
      >
        {/* mint underglow */}
        <div
          style={{
            position: "absolute",
            width: 620,
            height: 620,
            borderRadius: 620,
            background: "radial-gradient(closest-side, rgba(52,211,153,0.22), rgba(52,211,153,0))",
            display: "flex",
          }}
        />
        {/* mark tile */}
        <div
          style={{
            display: "flex",
            width: 320,
            height: 320,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 74,
            background: "linear-gradient(160deg, #2c2c31, #141416)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          }}
        >
          <svg width="224" height="224" viewBox="0 0 512 512">
            <path
              d="M150 360 L150 168 L256 296 L362 168 L362 360"
              fill="none"
              stroke="#34d399"
              strokeWidth="48"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* brand accent bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 8, background: "linear-gradient(90deg, #6ee7b7, #10b981)", display: "flex" }} />
      </div>
    ),
    size,
  );
}
