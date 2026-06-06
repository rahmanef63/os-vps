// Title rendering for the shared draw path: fit-to-width word-wrap + the
// optional TextStyle (font stack, color, stroke, background box, shadow).
// Pure Canvas 2D — used by preview AND export via drawClip.

import type { TextAnim, TextFont, TextStyle } from "./mock-timeline";

const FONT_STACK: Record<TextFont, string> = {
  sans: "system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'Cascadia Mono', Menlo, monospace",
  display: "'Arial Black', Impact, system-ui, sans-serif",
  hand: "'Comic Sans MS', 'Segoe Print', cursive",
};

// Greedy word-wrap a title into lines that each fit maxW at the current font.
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && ctx.measureText(next).width > maxW) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}

/** Draw a styled, wrapped title centered on the (already transformed) origin.
 *  Caller has translated to the text anchor; `inT` is the entrance progress. */
export function drawTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  inT: number,
  anim: TextAnim | undefined,
  ts: TextStyle | undefined,
): void {
  const yy = anim === "rise" ? (1 - inT) * (h * 0.04) : 0;
  const ss = anim === "pop" ? 0.7 + 0.3 * inT : 1;
  ctx.translate(w / 2, h / 2 + yy);
  ctx.scale(ss, ss);

  // Fit-to-width: sane base size × style multiplier, wrap, shrink until the
  // widest line fits the title-safe width.
  const fam = FONT_STACK[ts?.font ?? "sans"];
  const mult = Math.min(2, Math.max(0.5, ts?.size ?? 1));
  const maxW = w * 0.84;
  let size = Math.round(Math.min(w, h) * 0.11 * mult);
  let lines: string[] = [];
  for (let i = 0; i < 5; i++) {
    ctx.font = `800 ${size}px ${fam}`;
    lines = wrapLines(ctx, text, maxW);
    if (Math.max(...lines.map((l) => ctx.measureText(l).width)) <= maxW) break;
    size = Math.round(size * 0.86);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lh = size * 1.16;
  const y0 = -((lines.length - 1) * lh) / 2;

  // Background box per line (no shadow on the box).
  if (ts?.bg) {
    ctx.fillStyle = ts.bg;
    const px = size * 0.32;
    const py = size * 0.16;
    lines.forEach((l, i) => {
      const lw = ctx.measureText(l).width;
      const y = y0 + i * lh;
      const r = size * 0.18;
      const x0 = -lw / 2 - px;
      const bw = lw + px * 2;
      const bh = size + py * 2;
      const by = y - bh / 2;
      ctx.beginPath();
      ctx.roundRect(x0, by, bw, bh, r);
      ctx.fill();
    });
  }

  if (ts?.shadow !== false && !ts?.bg) {
    ctx.shadowColor = "rgba(0,0,0,.5)";
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.05;
  }
  if (ts?.stroke && (ts.strokeW ?? 0.08) > 0) {
    ctx.lineWidth = size * Math.min(0.2, ts.strokeW ?? 0.08);
    ctx.strokeStyle = ts.stroke;
    ctx.lineJoin = "round";
    lines.forEach((l, i) => ctx.strokeText(l, 0, y0 + i * lh));
  }
  ctx.fillStyle = ts?.color ?? "#ffffff";
  lines.forEach((l, i) => ctx.fillText(l, 0, y0 + i * lh));
}

/** Title style presets for the inspector grid (no third-party branding). */
export const TEXT_PRESETS: { id: string; label: string; style: TextStyle }[] = [
  { id: "classic", label: "Aa", style: {} },
  { id: "boxed", label: "Aa", style: { bg: "rgba(0,0,0,0.72)", shadow: false } },
  { id: "label", label: "Aa", style: { bg: "#ffffff", color: "#111111", shadow: false } },
  { id: "outline", label: "Aa", style: { color: "#ffffff", stroke: "#000000", strokeW: 0.1, shadow: false } },
  { id: "sunny", label: "Aa", style: { color: "#ffd60a", stroke: "#1b1b1b", strokeW: 0.08 } },
  { id: "berry", label: "Aa", style: { color: "#ff5c8a", stroke: "#2b0f1d", strokeW: 0.08 } },
  { id: "serif", label: "Aa", style: { font: "serif" } },
  { id: "mono", label: "Aa", style: { font: "mono", bg: "rgba(0,0,0,0.6)", shadow: false } },
  { id: "heavy", label: "Aa", style: { font: "display", size: 1.15 } },
  { id: "hand", label: "Aa", style: { font: "hand" } },
];
