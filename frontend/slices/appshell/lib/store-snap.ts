import type { WinId, SnapZone } from "./types";
import { M, patch } from "./store-state";
import { GAP, workArea, snapRect, setChromeInsets } from "./store-geometry";

// Snap + chrome-inset actions, split from store.ts (≤200 LOC discipline).
// Consumers keep importing from ../lib/store — it re-exports everything here.

/** Set the active shell's chrome insets AND re-tile every snapped/maximized
 *  window into the new work area. Without the re-tile, a window maximized
 *  under the Windows taskbar keeps that frozen height after switching to
 *  macOS (and vice versa). Free-floating windows are left alone. */
export function applyChromeInsets(i: { top?: number; bottom?: number }) {
  setChromeInsets(i);
  retileSnapped();
}

export function retileSnapped() {
  if (typeof window === "undefined") return;
  const { vw, top, bottom } = workArea();
  M.state.order.forEach((id) => {
    const win = M.state.windows[id];
    if (!win || win.minimized) return;
    if (win.maximized) patch(id, { x: GAP, y: top, w: vw - GAP * 2, h: bottom - top });
    else if (win.snapZone) patch(id, snapRect(win.snapZone));
  });
}

export function snapWindow(id: WinId, zone: SnapZone) {
  const win = M.state.windows[id];
  if (!win) return;
  patch(id, {
    ...snapRect(zone),
    maximized: false,
    snapZone: zone,
    prevRect: { x: win.x, y: win.y, w: win.w, h: win.h },
  });
  // Snap-Assist pulse: a transient one-shot for half-snaps (left/right) so a
  // shell can offer the other windows for the complementary zone. Pure UI
  // signal — no window state, so the single store stays the source of truth.
  if (zone === "left" || zone === "right") {
    snapListeners.forEach((cb) => cb({ id, zone }));
  }
}

type SnapPulse = { id: WinId; zone: SnapZone };
type SnapListener = (e: SnapPulse) => void;
const snapListeners = new Set<SnapListener>();
/** Subscribe to half-snap pulses (Windows Snap-Assist). Returns an unsubscribe. */
export function onSnap(cb: SnapListener): () => void {
  snapListeners.add(cb);
  return () => {
    snapListeners.delete(cb);
  };
}
