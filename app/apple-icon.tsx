import { ImageResponse } from "next/og";

// Apple touch icon (iOS home screen). iOS masks its own corners, so this is the
// full-bleed MASKABLE art (gradient square + folder-terminal glyph in the safe
// zone), rasterized from the same verified SVG via <img> (resvg) so there's no
// glyph drift vs the favicon. Text-free → no font embedding needed.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="b" x1="48" y1="40" x2="466" y2="474" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4a7cf8"/><stop offset="1" stop-color="#6a54f8"/></linearGradient></defs><rect width="512" height="512" fill="url(#b)"/><g transform="translate(256 256) scale(0.8) translate(-256 -256)"><g fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"><path d="M138 150 L238 150 L292 179 L374 179 Q402 179 402 207 L402 370 Q402 398 374 398 L138 398 Q110 398 110 370 L110 178 Q110 150 138 150 Z"/><path d="M166 272 L204 302 L166 332"/><path d="M226 348 L286 348"/><path d="M320 272 L358 302 L320 332"/></g><g fill="#ffffff"><circle cx="150" cy="188" r="11"/><circle cx="186" cy="188" r="11"/><circle cx="222" cy="188" r="11"/></g></g></svg>`;

export default function AppleIcon() {
  const uri = `data:image/svg+xml;base64,${Buffer.from(SVG).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <img src={uri} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
