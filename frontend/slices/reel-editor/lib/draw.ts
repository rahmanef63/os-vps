// THE shared draw path. Both the live preview canvas and the offline .webm
// renderer call drawFrame() so what-you-see == what-you-render. Pure Canvas 2D,
// no async: real media is read from the MediaCache elements at whatever frame
// they currently hold (the caller positions video time before drawing).

import type { Clip, Composition } from "./mock-timeline";
import { clipVal } from "./keyframes";
import type { MediaCache } from "./media-cache";
import { drawTitle } from "./draw-text";
import { adjustFilter, drawVignette } from "./draw-adjust";

function bgGradient(ctx: CanvasRenderingContext2D, w: number, h: number, src?: string) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  if (src === "gradient-b") {
    g.addColorStop(0, "#1b2050");
    g.addColorStop(1, "#5be0c8");
  } else {
    g.addColorStop(0, "#2a2f6b");
    g.addColorStop(1, "#ff7ac4");
  }
  return g;
}

// Cover-fit an image/video element into the comp frame (mirrors object-fit:cover).
function drawCover(
  ctx: CanvasRenderingContext2D,
  el: CanvasImageSource,
  sw: number,
  sh: number,
  w: number,
  h: number,
) {
  if (!sw || !sh) return;
  const r = Math.max(w / sw, h / sh);
  const dw = sw * r;
  const dh = sh * r;
  try {
    ctx.drawImage(el, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } catch {
    /* element not yet decodable this frame — skip, next redraw catches it */
  }
}

/** Draw one clip at the given comp frame with its fade + keyframe transforms.
 *  `covered` = a later clip cross-dissolves in over this one's tail, so it must
 *  stay opaque (skip the fade-to-black) and let the incoming clip blend over it. */
export function drawClip(
  ctx: CanvasRenderingContext2D,
  comp: Composition,
  clip: Clip,
  frame: number,
  cache: MediaCache,
  covered = false,
) {
  const { w, h } = comp;
  const local = frame - clip.start;
  const xf = clip.xfade ?? 0;
  const xtype = clip.xtype ?? "dissolve";
  const prog = xf > 0 ? Math.min(1, local / xf) : 1; // incoming transition 0..1
  // Dissolve ramps alpha; wipe/slide stay opaque (revealed geometrically below).
  const inT = xf > 0 ? (xtype === "dissolve" ? prog : 1) : Math.min(1, local / 12);
  const outT = covered ? 1 : Math.min(1, (clip.start + clip.len - frame) / 10);
  const fade = Math.min(inT, outT);
  const op = clipVal(clip, "opacity", local) / 100;
  const alpha = Math.max(0, fade * op);
  if (alpha <= 0) return;

  const sc = clipVal(clip, "scale", local) / 100;
  const tx = (clipVal(clip, "x", local) / 100) * w;
  const ty = (clipVal(clip, "y", local) / 100) * h;
  const rot = (clipVal(clip, "rotate", local) * Math.PI) / 180;

  ctx.save();
  ctx.globalAlpha = alpha;
  // Geometric transition for the incoming clip during its window (canvas space,
  // before the per-clip transform): wipe = grow a left→right reveal rect; slide =
  // enter from the right edge.
  if (xf > 0 && local < xf && xtype !== "dissolve") {
    const dir = clip.xdir ?? (xtype === "wipe" ? "left" : "right");
    const d = 1 - prog;
    if (xtype === "wipe") {
      ctx.beginPath();
      if (dir === "left") ctx.rect(0, 0, w * prog, h);
      else if (dir === "right") ctx.rect(w * d, 0, w * prog, h);
      else if (dir === "up") ctx.rect(0, 0, w, h * prog);
      else ctx.rect(0, h * d, w, h * prog);
      ctx.clip();
    } else {
      if (dir === "left") ctx.translate(-d * w, 0);
      else if (dir === "right") ctx.translate(d * w, 0);
      else if (dir === "up") ctx.translate(0, -d * h);
      else ctx.translate(0, d * h);
    }
  }
  ctx.translate(w / 2 + tx, h / 2 + ty);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  ctx.translate(-w / 2, -h / 2);

  // Per-clip color grading (filter is part of the save/restore state).
  ctx.filter = adjustFilter(clip.adjust);

  const m = clip.media;
  if (m?.type === "image") {
    const el = cache.image(m.url);
    if (el && el.complete) drawCover(ctx, el, el.naturalWidth, el.naturalHeight, w, h);
  } else if (m?.type === "video") {
    const el = cache.video(m.url);
    if (el && el.readyState >= 2) drawCover(ctx, el, el.videoWidth || m.natW, el.videoHeight || m.natH, w, h);
  } else if (clip.text != null) {
    drawTitle(ctx, clip.text, w, h, inT, clip.anim, clip.tstyle);
  } else if (clip.src === "logo") {
    const ls = 0.8 + 0.2 * inT;
    const side = w * 0.22 * ls;
    const x = (w - side) / 2;
    const y = (h - side) / 2;
    const lg = ctx.createLinearGradient(x, y, x + side, y + side);
    lg.addColorStop(0, "#ffffff");
    lg.addColorStop(1, "#cfd6e6");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.roundRect(x, y, side, side, side * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7a5cff";
    ctx.font = `900 ${Math.round(side * 0.34)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("rr", x + side / 2, y + side / 2);
  } else if (clip.color) {
    ctx.fillStyle = clip.src ? (bgGradient(ctx, w, h, clip.src) as unknown as string) : clip.color;
    ctx.fillRect(0, 0, w, h);
  }
  drawVignette(ctx, w, h, clip.adjust?.vignette ?? 0);
  ctx.restore();
}

/** Paint the whole composition at `frame` onto a comp-sized canvas context. */
export function drawFrame(ctx: CanvasRenderingContext2D, comp: Composition, frame: number, cache: MediaCache) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, comp.w, comp.h);
  // Clips that a later same-track clip dissolves in over (keep them opaque).
  const covered = new Set<string>();
  for (const n of comp.clips) {
    if (!((n.xfade ?? 0) > 0)) continue;
    for (const c of comp.clips) {
      if (c.id === n.id || c.track !== n.track) continue;
      if (c.start <= n.start && n.start < c.start + c.len) covered.add(c.id);
    }
  }
  // Tracks are layers: the timeline's TOP row (tracks[0]) is the FRONT layer,
  // so paint back-to-front by walking the track list in reverse. Within one
  // track, clips can only overlap via a transition (start order is fine).
  for (let i = comp.tracks.length - 1; i >= 0; i--) {
    const t = comp.tracks[i];
    if (t.hide) continue;
    const active = comp.clips
      .filter((c) => c.track === t.id && c.kind !== "audio" && frame >= c.start && frame < c.start + c.len)
      .sort((a, b) => a.start - b.start);
    for (const clip of active) drawClip(ctx, comp, clip, frame, cache, covered.has(clip.id));
  }
}
