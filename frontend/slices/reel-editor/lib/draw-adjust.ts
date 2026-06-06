// Per-clip color grading → a Canvas 2D filter string + a vignette overlay.
// Shared by preview and export (both go through drawClip). Approximations on
// purpose: temperature warms via sepia, cools via a slight hue rotation; fade
// is a washout (contrast down, brightness up).

import type { Adjust } from "./mock-timeline";

export function adjustFilter(a: Adjust | undefined): string {
  if (!a) return "none";
  const ex = a.exposure ?? 0;
  const ct = a.contrast ?? 0;
  const st = a.saturation ?? 0;
  const tp = a.temp ?? 0;
  const fd = a.fade ?? 0;
  const parts: string[] = [];
  if (ex) parts.push(`brightness(${(1 + ex / 100).toFixed(3)})`);
  if (ct || fd) parts.push(`contrast(${Math.max(0, 1 + ct / 100 - fd / 200).toFixed(3)})`);
  if (st) parts.push(`saturate(${Math.max(0, 1 + st / 100).toFixed(3)})`);
  if (tp > 0) parts.push(`sepia(${(tp / 200).toFixed(3)})`);
  else if (tp < 0) parts.push(`hue-rotate(${(tp * 0.35).toFixed(1)}deg)`);
  if (fd) parts.push(`brightness(${(1 + fd / 300).toFixed(3)})`);
  return parts.length ? parts.join(" ") : "none";
}

/** Darken the frame edges. Drawn in clip space after the content. */
export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number): void {
  if (amount <= 0) return;
  ctx.filter = "none";
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, amount / 100).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** True when any grading value is non-neutral (drives the inspector badge). */
export const hasAdjust = (a: Adjust | undefined): boolean =>
  !!a && Object.values(a).some((v) => (v ?? 0) !== 0);
