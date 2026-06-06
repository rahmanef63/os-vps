// Mock files for the quick-look viewer. Images are inline data-URI gradient
// SVGs so previews render fully offline (no external network). Video/audio use
// simulated playback (no real bytes in the mock fs).
export type SampleKind = "image" | "video" | "audio" | "pdf" | "text";

export type Sample = {
  name: string;
  kind: SampleKind;
  /** data-URI for image kinds; undefined for video/audio/pdf/text. */
  src?: string;
  /** Free-form meta (dimensions, duration, page count…). */
  meta?: string;
  /** Pixel dimensions for image kinds. */
  dims?: { w: number; h: number };
  /** Playback length in seconds for timed media. */
  duration?: number;
};

// Build a gradient SVG as a base64-free, URL-encoded data URI.
function gradientSvg(a: string, b: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
</linearGradient></defs>
<rect width="800" height="600" fill="url(#g)"/>
<circle cx="220" cy="190" r="120" fill="rgba(255,255,255,0.18)"/>
<text x="400" y="560" fill="rgba(255,255,255,0.85)" font-family="monospace"
 font-size="30" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const SAMPLES: Sample[] = [
  {
    name: "aurora.svg",
    kind: "image",
    src: gradientSvg("#1dd1a1", "#5f27cd", "aurora"),
    meta: "800 × 600",
    dims: { w: 800, h: 600 },
  },
  {
    name: "sunset.svg",
    kind: "image",
    src: gradientSvg("#ff9a6b", "#ee5a6f", "sunset"),
    meta: "800 × 600",
    dims: { w: 800, h: 600 },
  },
  {
    name: "deep-sea.svg",
    kind: "image",
    src: gradientSvg("#0a3d62", "#3aa0ff", "deep-sea"),
    meta: "800 × 600",
    dims: { w: 800, h: 600 },
  },
  { name: "demo-reel.mp4", kind: "video", meta: "0:24 · 1080p", duration: 24 },
  { name: "ambient-loop.mp3", kind: "audio", meta: "0:42 · 320kbps", duration: 42 },
  { name: "invoice.pdf", kind: "pdf", meta: "3 pages" },
  { name: "README.txt", kind: "text", meta: "1.2 KB" },
];
