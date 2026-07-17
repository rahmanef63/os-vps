import { ImageResponse } from "next/og";

// Apple touch icon (iOS home-screen). iOS applies its OWN rounded mask, so this
// is a full-bleed graphite square with the mint M inset — generated from code
// (no rasterizer in the toolchain). Text-free → no font embedding needed.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #2c2c31, #141416)",
        }}
      >
        <svg width="118" height="118" viewBox="0 0 512 512">
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
    ),
    size,
  );
}
