import type { Rect, SnapZone } from "./types";

// Window-manager geometry — PURE (no store access), so it lives apart from the
// stateful store. Window coords are relative to the desktop surface, which
// already starts below the menu bar at top:TOPBAR (we DON'T add TOPBAR again).

export const TOPBAR = 30;
export const DOCK_RESERVE = 92;
export const GAP = 8;

// Chrome insets in viewport px: `top` = the shell's top bar (macOS menu bar; 0
// on Windows), `bottom` = reserved bottom chrome (macOS dock; Windows taskbar).
// The active desktop shell sets these on mount via setChromeInsets so snap +
// maximize tile the right area; default = macOS. Window y is relative to the
// shell's window section (top = `topInset`); `bottom = vh - top - bottom` lands
// the usable floor above the bottom chrome (holds for any topInset).
let topInset = TOPBAR;
let bottomInset = DOCK_RESERVE;
export function setChromeInsets(i: { top?: number; bottom?: number }) {
  topInset = i.top ?? TOPBAR;
  bottomInset = i.bottom ?? DOCK_RESERVE;
}
export function chromeInsets() {
  return { top: topInset, bottom: bottomInset };
}

function viewport() {
  return { vw: window.innerWidth, vh: window.innerHeight };
}

// The usable desktop, in WINDOW coordinates. GAP inset on top/left/right;
// reserve the bottom chrome. Snap + maximize share it so every layout tiles the
// SAME area and nothing slides under the top bar or behind the dock/taskbar.
export function workArea() {
  const { vw, vh } = viewport();
  return { vw, vh, top: GAP, bottom: vh - topInset - bottomInset, left: GAP, right: vw - GAP };
}

// Snap target rects — halves, quadrants, top=maximize. All bounded by workArea
// so they reserve the menu bar + dock and tile with a GAP gutter (no overlap,
// no gaps, no dock collision).
export function snapRect(zone: SnapZone): Rect {
  const { vw, top, bottom } = workArea();
  const availH = bottom - top;
  const halfW = (vw - GAP * 3) / 2; // GAP outer-left + gutter + outer-right
  const rightX = GAP * 2 + halfW;
  const halfH = (availH - GAP) / 2; // GAP gutter between the two rows
  const rowB = top + halfH + GAP;
  const thirdW = (vw - GAP * 3) / 3; // ⅓ column (same gutter scheme as halves)
  const twoThirdW = thirdW * 2;
  const map: Record<SnapZone, Rect> = {
    left: { x: GAP, y: top, w: halfW, h: availH },
    right: { x: rightX, y: top, w: halfW, h: availH },
    top: { x: GAP, y: top, w: vw - GAP * 2, h: availH },
    tl: { x: GAP, y: top, w: halfW, h: halfH },
    tr: { x: rightX, y: top, w: halfW, h: halfH },
    bl: { x: GAP, y: rowB, w: halfW, h: halfH },
    br: { x: rightX, y: rowB, w: halfW, h: halfH },
    // tiling presets — ⅓/⅔ columns
    l13: { x: GAP, y: top, w: thirdW, h: availH },
    r23: { x: GAP * 2 + thirdW, y: top, w: twoThirdW, h: availH },
    l23: { x: GAP, y: top, w: twoThirdW, h: availH },
    r13: { x: GAP * 2 + twoThirdW, y: top, w: thirdW, h: availH },
  };
  return map[zone];
}

// Spawn placement: the classic cascade, but clamped to the work area so the
// Nth window never marches off the right/bottom edge or under the bottom
// chrome (audit: windows cascaded out of the viewport and behind the dock).
// Oversized requests shrink to fit; SSR falls back to the raw cascade.
export function spawnRect(n: number, w: number, h: number): Rect {
  const offset = (n % 6) * 28;
  if (typeof window === "undefined") return { x: 80 + offset, y: 64 + offset, w, h };
  const { vw, top, bottom } = workArea();
  const cw = Math.min(w, vw - GAP * 2);
  const ch = Math.min(h, bottom - top);
  return {
    x: Math.max(GAP, Math.min(80 + offset, vw - GAP - cw)),
    y: Math.max(top, Math.min(64 + offset, bottom - ch)),
    w: cw,
    h: ch,
  };
}

// Zone from a pointer near the screen edges (drag-to-snap).
export function snapZoneAt(px: number, py: number): SnapZone | null {
  const { vw, vh } = viewport();
  const m = 26;
  const corner = 120;
  if (py < topInset + 4) return "top";
  if (px < m) return py < corner ? "tl" : py > vh - corner ? "bl" : "left";
  if (px > vw - m) return py < corner ? "tr" : py > vh - corner ? "br" : "right";
  return null;
}
