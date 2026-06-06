// Per-layer clip masks (CSS clip-path) + the quick-pick color palette + safe
// areas. Pure data, shared by panel + canvas. Re-authored from the os-rr editor.

export type Mask = { id: string; label: string; value: string };

// `value` is the CSS clip-path; empty string = no mask.
export const MASKS: Mask[] = [
  { id: "none", label: "None", value: "" },
  { id: "circle", label: "Circle", value: "circle(50%)" },
  { id: "round", label: "Rounded", value: "inset(0 round 18%)" },
  { id: "triangle", label: "Triangle", value: "polygon(50% 0,100% 100%,0 100%)" },
  {
    id: "hexagon",
    label: "Hexagon",
    value: "polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0 50%)",
  },
  {
    id: "star",
    label: "Star",
    value:
      "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
  },
];

// Quick-pick fill/text palette: white, black, blue, pink, orange, green.
export const PALETTE = [
  "#ffffff",
  "#111827",
  "#2f7bf6",
  "#ff5f8f",
  "#ffb13b",
  "#34c759",
];

export type SafePlatform = "TikTok" | "Reels/Stories" | "IG Feed" | "YouTube";

export type SafeSpec = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  note: string;
};

// % insets of the frame where platform UI overlaps the design (official
// Meta/TikTok guidance). Keep key content inside the dashed central box.
export const SAFE: Record<SafePlatform, SafeSpec> = {
  TikTok: {
    top: 6,
    bottom: 20,
    left: 5,
    right: 14,
    note: "Bottom 20% captions/progress · right 14% action buttons",
  },
  "Reels/Stories": {
    top: 14,
    bottom: 35,
    left: 6,
    right: 6,
    note: "Meta: top 14%, bottom 35%, sides 6% (central 1010×1280)",
  },
  "IG Feed": {
    top: 6,
    bottom: 6,
    left: 6,
    right: 6,
    note: "Square/portrait feed — light margins",
  },
  YouTube: {
    top: 6,
    bottom: 10,
    left: 5,
    right: 5,
    note: "Lower-third can carry captions/CTA",
  },
};

export const SAFE_PLATFORMS = Object.keys(SAFE) as SafePlatform[];

// Default platform suggestion per aspect ratio (CSS `w / h` value).
export function suggestPlatform(aspect: string): SafePlatform {
  if (aspect === "9 / 16") return "TikTok";
  if (aspect === "16 / 9") return "YouTube";
  if (aspect === "4 / 5") return "Reels/Stories";
  return "IG Feed";
}

// Turn a "k: v; k2: v2" CSS string into a React style object (camelCased keys).
export function parseCss(css?: string): React.CSSProperties {
  const out: Record<string, string> = {};
  if (!css) return out;
  for (const decl of String(css).split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const k = decl.slice(0, i).trim();
    const v = decl.slice(i + 1).trim();
    if (!k || !v) continue;
    out[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out as React.CSSProperties;
}
