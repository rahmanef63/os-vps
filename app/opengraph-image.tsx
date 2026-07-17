import { ImageResponse } from "next/og";

// Social preview (og:image + twitter:image). Text-free by design — the MSO
// folder-terminal mark on a deep-navy brand stage with a blue underglow; the
// headline comes from og:title (the page <title>), so no font embedding is
// needed. The mark is the same verified SVG as the favicon, rasterized via <img>
// (resvg) so there's no glyph drift.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Manef Shell OS";

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="b" x1="48" y1="40" x2="466" y2="474" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4a7cf8"/><stop offset="1" stop-color="#6a54f8"/></linearGradient></defs><rect x="16" y="16" width="480" height="480" rx="116" fill="url(#b)"/><g fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"><path d="M138 150 L238 150 L292 179 L374 179 Q402 179 402 207 L402 370 Q402 398 374 398 L138 398 Q110 398 110 370 L110 178 Q110 150 138 150 Z"/><path d="M166 272 L204 302 L166 332"/><path d="M226 348 L286 348"/><path d="M320 272 L358 302 L320 332"/></g><g fill="#ffffff"><circle cx="150" cy="188" r="11"/><circle cx="186" cy="188" r="11"/><circle cx="222" cy="188" r="11"/></g></svg>`;

export default function OpengraphImage() {
  const uri = `data:image/svg+xml;base64,${Buffer.from(ICON).toString("base64")}`;
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
          background: "radial-gradient(120% 130% at 50% 0%, #141B33 0%, #0B1020 60%, #080b16 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 660,
            height: 660,
            borderRadius: 660,
            background: "radial-gradient(closest-side, rgba(74,124,248,0.32), rgba(74,124,248,0))",
            display: "flex",
          }}
        />
        <img src={uri} width={300} height={300} alt="" style={{ borderRadius: 68 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 8, background: "linear-gradient(90deg, #4a7cf8, #6a54f8)", display: "flex" }} />
      </div>
    ),
    size,
  );
}
